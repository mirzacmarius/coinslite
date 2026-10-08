# CoinsLite owns its Catalog, built only from sources we may store

CoinsLite's Catalog is built and maintained by CoinsLite. Every stored fact group, image and note comes from a source whose licence allows storing and displaying it commercially, and that source is recorded on the entry. The sources are public-domain data (such as US Mint issues), official lists reusable with attribution (such as the ECB's 2-euro commemoratives), official central-bank material and our own editing. Catalog data of unknown origin is not imported, even when it's available. Images appear only where the design is clearly free to show; every other entry shows a placeholder until a licence is held.

The faster alternatives were to import an existing catalogue whose origin we can't verify, or to fill the Catalog from a numismatic database API. Both were rejected. Bulk-copying another database's contents can infringe the EU database right even though single facts aren't protected. Numista's API terms forbid storing or caching its data persistently, and ADR 0001 needs Items to read stored facts from their Catalog entry. Coin and banknote designs are also copyrighted in several launch countries. Numista IDs are kept only as cross-references with an attributed link.

## Consequences

- Each new country needs editorial work before launch, and the Catalog starts smaller than an import would have made it.
- Catalog nodes carry provenance (source, author, licence, link) for their facts, image and notes. The admin editor and the CSV format include those fields.
- Licences for national catalogues and protected designs are pursued in parallel; when granted, they are recorded as sources like any other.
