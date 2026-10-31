
export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    const segments = path.split("/").filter(Boolean);

    routes.push({
      method: method.toUpperCase(),
      path,
      segments,
      handler,
    });
  }

  function match(method, pathname) {
    const requestSegments = pathname.split("/").filter(Boolean);

    for (const route of routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== requestSegments.length) continue;

      const params = {};
      let matches = true;

      for (let i = 0; i < route.segments.length; i += 1) {
        const expected = route.segments[i];
        const actual = requestSegments[i];

        if (expected.startsWith(":")) {
          try {
            params[expected.slice(1)] = decodeURIComponent(actual);
          } catch {
            matches = false;
            break;
          }
        } else if (expected !== actual) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { handler: route.handler, params };
      }
    }

    return null;
  }

  return {
    get(path, handler) {
      add("GET", path, handler);
    },
    post(path, handler) {
      add("POST", path, handler);
    },
    put(path, handler) {
      add("PUT", path, handler);
    },
    patch(path, handler) {
      add("PATCH", path, handler);
    },
    delete(path, handler) {
      add("DELETE", path, handler);
    },
    match,
  };
}
