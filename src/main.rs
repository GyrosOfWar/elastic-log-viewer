use chrono::prelude::*;
use elasticsearch::{http::transport::Transport, Elasticsearch, SearchParts};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::convert::Infallible;
use std::error::Error;
use std::sync::Arc;
use warp::{reject::Reject, Filter};

pub type IoResult<T> = std::result::Result<T, Box<dyn Error>>;
pub type WarpResult<T> = std::result::Result<T, warp::Rejection>;
pub type ElasticResult<T> = std::result::Result<T, elasticsearch::Error>;

const CONFIG_FILE: &str = "log-viewer.json";

pub fn fix_property_keys(mut log_line: Value) -> Value {
    use heck::MixedCase;

    let obj = log_line
        .as_object_mut()
        .expect("Cannot fix property keys on a not-object");
    let new_obj: BTreeMap<_, _> = obj
        .into_iter()
        .map(|(k, v)| (k.replace('.', " ").to_mixed_case(), v))
        .collect();
    json!(new_obj)
}

#[derive(Deserialize, Debug)]
pub struct ElasticsearchResponse<T> {
    pub hits: Hits<T>,
}

#[derive(Deserialize, Debug)]
pub struct Hits<T> {
    pub hits: Vec<Hit<T>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Hit<T> {
    #[serde(rename = "_source")]
    pub source: T,
    pub sort: Option<Vec<Value>>,
    #[serde(rename = "_id")]
    pub id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub elastic_url: String,
    pub log_level: log::Level,
    pub index_pattern: String,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            elastic_url: "http://localhost:9200".into(),
            log_level: log::Level::Info,
            index_pattern: "filebeat-*".into(),
        }
    }
}

impl Config {
    pub fn read() -> IoResult<Self> {
        use std::fs::File;
        use std::path::Path;

        let config_path = Path::new(CONFIG_FILE);
        if config_path.is_file() {
            serde_json::from_reader(File::open(config_path)?).map_err(From::from)
        } else {
            Ok(Self::default())
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Order {
    Asc,
    Desc,
}

impl Default for Order {
    fn default() -> Self {
        Order::Desc
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilter {
    pub size: u64,
    pub query: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub search_after: Option<Vec<Value>>,
    #[serde(default)]
    pub order: Order,
}

impl SearchFilter {
    pub fn into_query_object(self) -> Value {
        let mut clauses = vec![];

        if let Some(query) = self.query {
            clauses.push(json!({
                "simple_query_string": {
                    "query": query
                }
            }))
        }

        if self.start_date.is_some() || self.end_date.is_some() {
            let start = if let Some(start) = self.start_date {
                Some(start)
            } else {
                None
            };

            let end = if let Some(end) = self.end_date {
                Some(end)
            } else {
                None
            };

            clauses.push(json!({
                "range": {
                    "@timestamp": {
                        "gte": start,
                        "lte": end,
                    }
                }
            }));
        }

        let mut query = json!({
            "query": {
                "bool": {
                    "must": clauses
                }
            },
            "size": self.size,
            "sort": {"@timestamp": {"order": self.order}},
        });

        if let Some(after) = self.search_after {
            query["search_after"] = json!(after);
        }
        log::debug!("query object: {}", query);
        query
    }
}

#[derive(Debug)]
pub struct ElasticsearchError(elasticsearch::Error);

impl Reject for ElasticsearchError {}

pub struct Context {
    elastic: Elasticsearch,
    config: Config,
}

pub async fn fetch_logs(
    elastic: &Elasticsearch,
    index_pattern: &str,
    filter: SearchFilter,
) -> ElasticResult<Vec<Hit<Value>>> {
    let response = elastic
        .search(SearchParts::Index(&[index_pattern]))
        .body(filter.into_query_object())
        .send()
        .await?;

    let body: ElasticsearchResponse<Value> = response.read_body().await?;

    Ok(body
        .hits
        .hits
        .into_iter()
        .map(|hit| Hit {
            id: hit.id,
            sort: hit.sort,
            source: fix_property_keys(hit.source),
        })
        .collect())
}

pub async fn get_logs(context: Arc<Context>, filter: SearchFilter) -> WarpResult<impl warp::Reply> {
    log::info!("getting logs for filter {:?}", filter);

    let hits = fetch_logs(&context.elastic, &context.config.index_pattern, filter)
        .await
        .map_err(|e| warp::reject::custom(ElasticsearchError(e)))?;

    Ok(warp::reply::json(&hits))
}

fn with_context(
    context: Arc<Context>,
) -> impl Filter<Extract = (Arc<Context>,), Error = Infallible> + Clone {
    warp::any().map(move || (context.clone()))
}

#[tokio::main]
async fn main() -> IoResult<()> {
    let config = Config::read()?;
    std::env::set_var("RUST_LOG", format!("{},hyper=warn", config.log_level));
    env_logger::init();

    log::debug!("Starting with config {:?}", config);

    let transport = Transport::single_node(&config.elastic_url)?;
    let elastic = Elasticsearch::new(transport);

    let context = Arc::new(Context { config, elastic });

    let log_route = warp::path!("api" / "v1" / "logs")
        .and(with_context(context))
        .and(warp::query::<SearchFilter>())
        .and_then(get_logs);

    let routes = warp::get().and(log_route);

    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;

    Ok(())
}
