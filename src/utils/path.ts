import { resolve, normalize, join, sep } from 'path';

export const validatePath = (requestedPath: string, root: string): boolean => {
  const resolvedRoot = resolve(root);
  const resolvedRequest = resolve(requestedPath);

  return (
    resolvedRequest.startsWith(resolvedRoot + sep) ||
    resolvedRequest === resolvedRoot
  );
};

export const resolveSafePath = (path: string, root: string): string | null => {
  const cleanPath = path === '' || path === '/' ? '' : path;
  const requestedPath = normalize(join(root, cleanPath));

  if (!validatePath(requestedPath, root)) {
    return null;
  }

  return requestedPath;
};
