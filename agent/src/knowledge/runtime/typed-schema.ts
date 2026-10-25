/** Additive v2 projection. Original revisions, K1 identities and documents remain immutable. */
export const TYPED_SCHEMA = `
CREATE TABLE business_items(
 item TEXT PRIMARY KEY, revision TEXT NOT NULL REFERENCES revisions(revision),
 type TEXT NOT NULL CHECK(type IN ('experience','strategy','reflex','core','combo','direction','vocab','fact')),
 original_id TEXT NOT NULL, parent_id TEXT, ordinal INTEGER NOT NULL CHECK(ordinal>=0),
 character TEXT NOT NULL, status TEXT, game_version TEXT,
 payload TEXT NOT NULL CHECK(json_valid(payload)), tool_payload TEXT NOT NULL CHECK(json_valid(tool_payload)), UNIQUE(revision,type,original_id,parent_id));
CREATE INDEX business_scope ON business_items(type,character,revision,original_id);
CREATE INDEX business_order ON business_items(type,character,original_id,parent_id,item,revision);
CREATE INDEX business_revision ON business_items(revision,ordinal);
CREATE TABLE experience_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), scope TEXT NOT NULL, lesson TEXT NOT NULL,
 support INTEGER NOT NULL CHECK(support>=0), contradict INTEGER NOT NULL CHECK(contradict>=0));
CREATE TABLE strategy_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), strategy TEXT NOT NULL,
 trigger_json TEXT NOT NULL CHECK(json_valid(trigger_json)), confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1));
CREATE TABLE reflex_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), applies_to TEXT NOT NULL,
 predicate_json TEXT NOT NULL CHECK(json_valid(predicate_json)), signal_json TEXT NOT NULL CHECK(json_valid(signal_json)));
CREATE INDEX reflex_use ON reflex_details(applies_to,item);
CREATE TABLE core_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), direction TEXT NOT NULL, name TEXT NOT NULL,
 scope_json TEXT NOT NULL CHECK(json_valid(scope_json)));
CREATE INDEX core_direction ON core_details(direction,item);
CREATE TABLE combo_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), core_id TEXT NOT NULL, boss TEXT,
 cards_json TEXT NOT NULL CHECK(json_valid(cards_json)), prerequisites_json TEXT CHECK(prerequisites_json IS NULL OR json_valid(prerequisites_json)));
CREATE INDEX combo_boss ON combo_details(boss,item);
CREATE TABLE vocab_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), dimension TEXT NOT NULL, label TEXT NOT NULL);
CREATE INDEX vocab_dimension ON vocab_details(dimension,item);
CREATE TABLE fact_details(
 item TEXT PRIMARY KEY REFERENCES business_items(item), entity_kind TEXT NOT NULL CHECK(entity_kind IN ('cards','relics','monsters','events')),
 name TEXT NOT NULL, facts_json TEXT NOT NULL CHECK(json_valid(facts_json)));
CREATE INDEX fact_kind ON fact_details(entity_kind,item);
CREATE TABLE item_terms(
 item TEXT NOT NULL REFERENCES business_items(item), category TEXT NOT NULL, term TEXT NOT NULL,
 PRIMARY KEY(item,category,term));
CREATE INDEX item_term_lookup ON item_terms(category,term,item);
CREATE TABLE item_links(
 item TEXT NOT NULL REFERENCES business_items(item), relation TEXT NOT NULL, target TEXT NOT NULL,
 PRIMARY KEY(item,relation,target));
CREATE INDEX item_link_target ON item_links(relation,target,item);
CREATE TABLE item_evidence(
 item TEXT NOT NULL REFERENCES business_items(item), ordinal INTEGER NOT NULL, role TEXT NOT NULL,
 source TEXT, sha256 TEXT, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(item,ordinal));
CREATE INDEX item_evidence_source ON item_evidence(source,sha256,item);
CREATE TABLE item_grams(
 gram TEXT NOT NULL, item TEXT NOT NULL REFERENCES business_items(item), PRIMARY KEY(gram,item));
CREATE VIRTUAL TABLE item_search USING fts5(item UNINDEXED, body, tokenize='trigram');
`;
