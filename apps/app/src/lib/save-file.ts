/**
 * Hands text or bytes to the browser as a downloaded file named `name`.
 * Strings are written as UTF-8.
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
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the file after the click returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
