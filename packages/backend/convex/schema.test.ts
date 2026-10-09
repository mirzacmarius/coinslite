import { expect, test } from "vitest";
import schema from "./schema";

type ExportedTable = {
  tableName: string;
  indexes: { indexDescriptor: string }[];
  stagedDbIndexes?: { indexDescriptor: string }[];
  searchIndexes: { indexDescriptor: string }[];
  stagedSearchIndexes?: { indexDescriptor: string }[];
  vectorIndexes: { indexDescriptor: string }[];
  stagedVectorIndexes?: { indexDescriptor: string }[];
};

// convex-test accepts any name, but a deployment refuses the whole schema.
test("every index name is one a deployment accepts", () => {
  // `export()` is what a deployment receives; Convex leaves it out of its types.
  const exported = (schema as unknown as { export(): string }).export();
  const { tables } = JSON.parse(exported) as {
    tables: ExportedTable[];
  };
  const names = tables.flatMap((table) =>
    [
      ...table.indexes,
      ...(table.stagedDbIndexes ?? []),
      ...table.searchIndexes,
      ...(table.stagedSearchIndexes ?? []),
      ...table.vectorIndexes,
      ...(table.stagedVectorIndexes ?? []),
    ].map((index) => `${table.tableName}.${index.indexDescriptor}`),
  );
  const invalid = names.filter(
    (name) => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name.split(".")[1]),
  );
  expect(invalid).toEqual([]);
});
