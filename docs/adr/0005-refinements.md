# R-ADR-005: Pure result refinements

Optional `@searchivo/core/refinements` operates on ranked hits. Equality and membership are typed to scalar field values; ranges require numeric fields and inclusive finite bounds. Filters are conjunctive. Facets count filtered hits before pagination and are not disjunctive. Facet values retain first-hit order. No persistent facet structures are added to the index.

Sorting compares scalar values using JavaScript relational order (strings use UTF-16 lexical order, not locale collation), and stable ties retain relevance/insertion ordering. Default offset=0 and limit=20; zero limit is valid and still returns totals/facets. Empty query still produces no hits, not match-all browsing. Input arrays are never sorted in place.

Filtering/faceting are O(hits × configured predicates/fields), sorting O(hits log hits). Ranking occurs before this optional pure refinement layer; a future integrated filtering stage may save ranking work if measurements justify that coupling. This trades avoidable ranking cost on heavily filtered queries for a zero-cost optional module boundary.
