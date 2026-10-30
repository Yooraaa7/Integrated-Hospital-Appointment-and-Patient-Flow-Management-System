/*
    Load order on every page:
        <script src="ams.js"></script>
        <script src="ams-api.js"></script>
        <script src="ams-ui.js"></script>

    What the bridge handles, so the backend can stay close to the QMS style:
      - base URL: "/api" when the page is served by Express (like qms-api.js),
        or http://localhost:3000/api when opened from VS Code Live Server.
        Override with window.AMS_API_BASE before ams.js.
      - JWT in sessionStorage ("amsToken"), sent as a Bearer token
      - response envelopes, any of these are accepted:
            { success: true, appointments: [...] }       (QMS style, one key)
            { success: true, appointments: [...], page, pageSize, totalItems }
            { success: true, data: {...} }
            plain JSON with no "success" (the OpenAPI shape)
        and { success: false, message } for errors
      - snake_case keys from PostgreSQL rows become camelCase
        (patient_name -> patientName), so routes may return raw rows
      - date values sent as full timestamps become "YYYY-MM-DD"
      - 401 clears the session and redirects to login.html
        (change it with window.AMS_LOGIN_PAGE, or set "" to switch it off)
*/

(() => {
    "use strict";

    if (typeof AMS === "undefined") {
        console.error("ams-api.js must be loaded after ams.js");
        return;
    }

    const base = AMS.API_BASE;

    const token = () =>
        sessionStorage.getItem("amsToken");

    // ============================================
    // RESPONSE MAPPING
    // ============================================

    const toCamel = key =>
        key.replace(
            /_([a-z0-9])/g,
            (match, character) => character.toUpperCase()
        );

    const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

    // PostgreSQL DATE columns can arrive as a timestamp
    // ("2026-10-19T16:00:00.000Z"). Show them as a local date.
    function fixDate(value) {
        if (
            typeof value === "string" &&
            ISO_TIMESTAMP.test(value)
        ) {
            const date = new Date(value);

            if (!Number.isNaN(date.getTime())) {
                return AMS.toISODate(date);
            }
        }

        return value;
    }

    function camelize(value, key) {
        if (Array.isArray(value)) {
            return value.map(item => camelize(item));
        }

        if (value && typeof value === "object") {
            const result = {};

            Object.keys(value).forEach(name => {
                const camelName = toCamel(name);

                result[camelName] = camelize(
                    value[name],
                    camelName
                );
            });

            return result;
        }

        return key === "date"
            ? fixDate(value)
            : value;
    }

    // Removes the { success, message } wrapper so ams.js
    // always receives the plain data.
    function unwrap(body) {
        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            !("success" in body)
        ) {
            return body;
        }

        const rest = { ...body };

        delete rest.success;
        delete rest.message;

        if ("data" in rest) {
            return rest.data;
        }

        const keys = Object.keys(rest);

        // { success, doctors: [...] } or { success, appointment: {...} }
        if (
            keys.length === 1 &&
            rest[keys[0]] !== null &&
            typeof rest[keys[0]] === "object"
        ) {
            return rest[keys[0]];
        }

        // { success, appointments: [...], page, pageSize, totalItems }
        const arrayKey = keys.find(
            name => Array.isArray(rest[name])
        );

        if (arrayKey && !("items" in rest)) {
            return {
                ...rest,
                items: rest[arrayKey]
            };
        }

        return rest;
    }

    // ============================================
    // REQUEST
    // ============================================

    function handleUnauthorized(status, path) {
        if (
            status !== 401 ||
            path.startsWith("/auth/login")
        ) {
            return;
        }

        AMS.clearSession();

        // login.html is the default. Set window.AMS_LOGIN_PAGE = ""
        // to turn the redirect off.
        const loginPage =
            typeof window.AMS_LOGIN_PAGE === "string"
                ? window.AMS_LOGIN_PAGE
                : "login.html";

        if (
            loginPage &&
            !location.pathname.endsWith("/" + loginPage)
        ) {
            location.replace(loginPage);
        }
    }

    async function request(method, path, body) {
        const headers = {
            Accept: "application/json"
        };

        const options = {
            method,
            headers
        };

        if (body instanceof FormData) {
            // The browser sets the multipart boundary.
            options.body = body;
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        if (token()) {
            headers.Authorization = `Bearer ${token()}`;
        }

        let response;

        try {
            response = await fetch(base + path, options);
        } catch (error) {
            throw new AMS.AmsError(
                "Cannot reach the server. " +
                "Check that the backend is running.",
                0,
                "NETWORK_ERROR"
            );
        }

        if (response.status === 204) {
            return null;
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new AMS.AmsError(
                "Invalid server response",
                response.status,
                "INVALID_RESPONSE"
            );
        }

        data = camelize(data);

        const failed =
            !response.ok ||
            (
                data &&
                typeof data === "object" &&
                data.success === false
            );

        if (failed) {
            handleUnauthorized(response.status, path);

            throw new AMS.AmsError(
                (data && (data.message || data.error)) ||
                    `Request failed: ${response.status}`,
                response.status,
                data && data.code,
                data && data.details,
                data
            );
        }

        return unwrap(data);
    }

    const get = path =>
        request("GET", path);

    const post = (path, body) =>
        request("POST", path, body);

    // Quick check from the browser console: await AMS_API.health()
    const health = () =>
        get("/health");

    window.AMS_API = {
        base,
        request,
        get,
        post,
        health,
        camelize,
        unwrap
    };
})();