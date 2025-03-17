import { resolve as resolveTs } from 'ts-node/esm';
import * as tsNode from 'ts-node';

// Initialize ts-node
const service = tsNode.register({
  esm: true,
  transpileOnly: true,
  moduleResolution: 'node16'
});

export function resolve(specifier, context, nextResolve) {
  return resolveTs(specifier, context, nextResolve);
}

export function load(url, context, nextLoad) {
  return nextLoad(url, context);
}

export function getFormat(url, context, nextGetFormat) {
  // Return 'module' for TypeScript files
  if (url.endsWith('.ts')) {
    return { format: 'module' };
  }
  return nextGetFormat(url, context);
}

export function transformSource(source, context, nextTransformSource) {
  // Transform TypeScript files
  if (context.url.endsWith('.ts')) {
    const { code } = service.compile(source.toString(), context.url);
    return { source: code };
  }
  return nextTransformSource(source, context);
}
