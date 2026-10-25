/** Schema 3 adds release-bound classification relations without editing original knowledge revisions. */
export const CLASSIFICATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS classification_bindings(
 revision TEXT NOT NULL REFERENCES revisions(revision), item TEXT NOT NULL REFERENCES business_items(item),
 payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(revision,item));
CREATE INDEX IF NOT EXISTS classification_item ON classification_bindings(item,revision);
CREATE TABLE IF NOT EXISTS classification_terms(
 revision TEXT NOT NULL, item TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('topic','entity','alias')),
 term TEXT NOT NULL, PRIMARY KEY(revision,item,category,term),
 FOREIGN KEY(revision,item) REFERENCES classification_bindings(revision,item));
CREATE INDEX IF NOT EXISTS classification_term_lookup ON classification_terms(category,term,item,revision);
`;
