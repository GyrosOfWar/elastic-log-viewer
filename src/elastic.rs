use crate::ElasticResult;
use chrono::prelude::*;
use elasticsearch::{Elasticsearch, SearchParts};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;

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
    pub highlight: Option<Value>,
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
            "highlight": {
                "fields": {
                    "message": {}
                },
                "pre_tags": ["<span class='highlight'>"],
                "post_tags": ["</span>"]
            }
        });

        if let Some(after) = self.search_after {
            query["search_after"] = json!(after);
        }
        log::debug!("query object: {}", query);
        query
    }
}

fn fix_property_keys(mut log_line: Value) -> Value {
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

pub struct LogClient {
    client: Elasticsearch,
}

impl LogClient {
    pub fn new(elastic: Elasticsearch) -> Self {
        Self { client: elastic }
    }

    pub async fn fetch_logs(
        &self,
        index_pattern: &str,
        filter: SearchFilter,
    ) -> ElasticResult<Vec<Hit<Value>>> {
        let response = self
            .client
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
                highlight: hit.highlight,
            })
            .collect())
    }
}
