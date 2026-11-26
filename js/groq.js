/** Groq-powered natural-language DFA generation. */
class GroqDFA {
    static async generate(command) {
        const response = await fetch("/api/generate-dfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command })
        });
        // Read the body as text first. Some server/proxy failures return an
        // empty body (or HTML), which makes response.json() throw a vague
        // "Unexpected end of JSON input" error.
        const body = await response.text();
        let payload = {};
        if (body.trim()) {
            try {
                payload = JSON.parse(body);
            } catch {
                throw new Error(`Backend returned an invalid response (${response.status}).`);
            }
        }
        if (!response.ok) {
            const hint = response.status === 405
                ? " Start the app with `npm start` and open http://localhost:3000 (the API is not available from a static file server)."
                : "";
            throw new Error((payload.error || `Backend request failed (${response.status}).`) + hint);
        }
        if (typeof payload.text !== "string" || !payload.text.trim()) {
            throw new Error("The AI service returned an empty DFA definition.");
        }

        let definition;
        try {
            definition = JSON.parse(payload.text);
        } catch {
            throw new Error("The AI service returned invalid DFA JSON.");
        }
        GroqDFA.validate(definition);
        return definition;
    }

    static validate(dfa) {
        if (!Array.isArray(dfa.states) || !dfa.states.length || !Array.isArray(dfa.alphabet) || !dfa.alphabet.length ||
            typeof dfa.initialState !== "string" || !Array.isArray(dfa.finalStates) || !dfa.transitions ||
            !dfa.states.includes(dfa.initialState)) throw new Error("Groq returned an incomplete DFA definition.");
        if (dfa.alphabet.some(symbol => typeof symbol !== "string" || [...symbol].length !== 1)) {
            throw new Error("Groq returned an alphabet containing multi-character symbols.");
        }
        for (const state of dfa.states) {
            if (!dfa.transitions[state]) throw new Error(`Missing transitions for ${state}.`);
            for (const symbol of dfa.alphabet) {
                if (!dfa.states.includes(dfa.transitions[state][symbol])) {
                    throw new Error(`Invalid transition from ${state} on ${symbol}.`);
                }
            }
        }
    }
}
window.GroqDFA = GroqDFA;
