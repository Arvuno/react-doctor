// Normalizes a (potentially absolute or `./`-prefixed) file path to a
// path relative to `rootDirectory`, using forward slashes. Falls back
// to stripping a leading `./` when the file path doesn't sit under the
// root — diagnostics from external sources sometimes carry a path the
// caller still wants to match against the user's globs.
export const toRelativePath = (filePath: string, rootDirectory: string): string => {
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const normalizedRoot = rootDirectory.replace(/\\/g, "/").replace(/\/$/, "") + "/";

  if (normalizedFilePath.startsWith(normalizedRoot)) {
    return normalizedFilePath.slice(normalizedRoot.length);
  }

  return normalizedFilePath.replace(/^\.\//, "");
};
