use crate::elastic::{LogClient, SearchFilter};
use elasticsearch::{http::transport::Transport, Elasticsearch};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::error::Error;
use std::sync::Arc;
use warp::{reject::Reject, Filter};

mod elastic;

pub type IoResult<T> = std::result::Result<T, Box<dyn Error>>;
pub type WarpResult<T> = std::result::Result<T, warp::Rejection>;
pub type ElasticResult<T> = std::result::Result<T, elasticsearch::Error>;

const CONFIG_FILE: &str = "log-viewer.json";

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

#[derive(Debug)]
pub struct ElasticsearchError(elasticsearch::Error);

impl Reject for ElasticsearchError {}

pub struct Context {
    pub log_client: LogClient,
    pub config: Config,
}

fn to_rejection(error: elasticsearch::Error) -> warp::Rejection {
    warp::reject::custom(ElasticsearchError(error))
}

pub async fn get_logs(context: Arc<Context>, filter: SearchFilter) -> WarpResult<impl warp::Reply> {
    log::info!("getting logs for filter {:?}", filter);

    let hits = context
        .log_client
        .fetch_logs(&context.config.index_pattern, filter)
        .await
        .map_err(to_rejection)?;

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
    let log_client = LogClient::new(elastic);

    let context = Arc::new(Context { config, log_client });

    let log_route = warp::path!("api" / "v1" / "logs")
        .and(with_context(context.clone()))
        .and(warp::query::<SearchFilter>())
        .and_then(get_logs);

    let routes = warp::get().and(log_route);

    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;

    Ok(())
}
