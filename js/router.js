/* ============================================
   Hash-Based SPA Router
   ============================================ */

const Router = (function () {
    let routes = {};
    let currentRoute = null;

    function init(routeMap) {
        routes = routeMap;
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
    }

    function handleRoute() {
        const hash = window.location.hash || '#/';
        let matched = false;

        for (const [pattern, handler] of Object.entries(routes)) {
            const params = matchRoute(pattern, hash);
            if (params !== null) {
                currentRoute = { path: hash, pattern, params };
                handler(params);
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Default to dashboard
            navigate('/');
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function matchRoute(pattern, hash) {
        // Convert pattern like '#/college/:code' to regex
        const cleanHash = hash.replace(/^#/, '');
        const parts = pattern.split('/');
        const hashParts = cleanHash.split('/');

        if (parts.length !== hashParts.length) return null;

        const params = {};
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith(':')) {
                params[parts[i].slice(1)] = decodeURIComponent(hashParts[i]);
            } else if (parts[i] !== hashParts[i]) {
                return null;
            }
        }
        return params;
    }

    function navigate(path) {
        window.location.hash = '#' + path;
    }

    function getCurrentRoute() {
        return currentRoute;
    }

    return { init, navigate, getCurrentRoute };
})();
