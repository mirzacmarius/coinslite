/**
 * Hands text to the browser as a downloaded file named `name`. Strings are
 * written as UTF-8.
 */
export function saveFile(
  name: string,
  parts: BlobPart[],
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob(parts, { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
