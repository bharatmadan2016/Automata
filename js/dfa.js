/**
 * DFA Model - Formal 5-tuple: M = (Q, Sigma, delta, q0, F)
 * Manages the central automata data structure and geometric layout coordinates.
 */
class DFA {
    /**
     * Initializes an empty DFA instance with default collections.
     */
    constructor() {
        this.states = [];            // Q: Array of state IDs (e.g., ["q0", "q1", "q2"])
        this.alphabet = [];          // Sigma: Array of input symbols (e.g., ["0", "1"])
        this.initialState = null;    // q0: Start state ID
        this.finalStates = new Set();// F: Set of accepting state IDs
        this.transitions = {};       // delta: { stateId: { symbol: nextStateId } }
        this.positions = {};         // Layout coordinates for SVG graph: { stateId: { x, y } }
    }

    /**
     * Resets the automaton to an empty initial state, removing all states, alphabet symbols, and transitions.
     * @returns {void}
     * @throws {Error} None. Edge condition: safe to call on an already empty DFA.
     */
    clear() {
        this.states = [];
        this.alphabet = [];
        this.initialState = null;
        this.finalStates.clear();
        this.transitions = {};
        this.positions = {};
    }

    /**
     * Adds a new state to Q and initializes its transition table mapping.
     * Automatically sets the state as initialState if it is the first state added.
     * @param {string} name - Identifier for the state (e.g. "q0"). Whitespace is trimmed.
     * @param {number|null} [x=null] - Optional X-coordinate on the SVG canvas.
     * @param {number|null} [y=null] - Optional Y-coordinate on the SVG canvas.
     * @returns {boolean} True if the state was successfully added; false if the name is empty or duplicate.
     * @throws {Error} None. Edge condition: rejects duplicate state IDs or empty/whitespace-only names.
     */
    addState(name, x = null, y = null) {
        const stateId = name.trim();
        if (!stateId || this.states.includes(stateId)) {
            return false;
        }
        this.states.push(stateId);
        this.transitions[stateId] = {};
        
        // Auto position if not provided
        if (x !== null && y !== null) {
            this.positions[stateId] = { x, y };
        } else {
            this.autoPositionState(stateId);
        }

        // If first state, make it initial by default
        if (this.states.length === 1) {
            this.initialState = stateId;
        }
        return true;
    }

    /**
     * Removes an existing state from Q, cleans up associated transitions, layout positions, and final state memberships.
     * If the removed state was the start state q0, reassigns q0 to the next available state or null.
     * @param {string} stateId - Identifier of the state to remove.
     * @returns {boolean} True if the state was found and removed; false if the state does not exist in Q.
     * @throws {Error} None. Edge condition: handles removal of start state, final state, or state with active incoming/outgoing transitions.
     */
    removeState(stateId) {
        if (!this.states.includes(stateId)) return false;

        this.states = this.states.filter(s => s !== stateId);
        delete this.transitions[stateId];
        delete this.positions[stateId];
        this.finalStates.delete(stateId);

        if (this.initialState === stateId) {
            this.initialState = this.states.length > 0 ? this.states[0] : null;
        }

        // Remove incoming transitions to this state
        for (const s of this.states) {
            if (this.transitions[s]) {
                for (const sym of this.alphabet) {
                    if (this.transitions[s][sym] === stateId) {
                        delete this.transitions[s][sym];
                    }
                }
            }
        }
        return true;
    }

    /**
     * Sets the input alphabet Sigma, deduplicating symbols and trimming whitespace.
     * Cleans up any existing transitions defined for symbols that are no longer part of the updated alphabet.
     * @param {string[]} symbolsArray - Array of raw alphabet symbol strings.
     * @returns {void}
     * @throws {Error} None. Edge condition: automatically trims whitespace, discards empty strings, and deduplicates elements.
     */
    setAlphabet(symbolsArray) {
        const cleaned = [...new Set(symbolsArray.map(s => s.trim()).filter(s => s.length > 0))];
        this.alphabet = cleaned;

        // Clean up any transitions using symbols no longer in alphabet
        for (const s of this.states) {
            if (this.transitions[s]) {
                for (const sym of Object.keys(this.transitions[s])) {
                    if (!this.alphabet.includes(sym)) {
                        delete this.transitions[s][sym];
                    }
                }
            }
        }
    }

    /**
     * Designates an existing state as the initial (start) state q0.
     * @param {string} stateId - Identifier of the state to set as initial.
     * @returns {boolean} True if stateId exists in Q and was set; false if stateId is not in Q.
     * @throws {Error} None. Edge condition: returns false if state is nonexistent in Q.
     */
    setInitialState(stateId) {
        if (this.states.includes(stateId)) {
            this.initialState = stateId;
            return true;
        }
        return false;
    }

    /**
     * Toggles the final (accepting) status of a state in the accepting set F.
     * @param {string} stateId - Identifier of the state to toggle.
     * @returns {boolean} True if state exists and its status was toggled; false if state is not in Q.
     * @throws {Error} None. Edge condition: returns false if stateId does not belong to Q.
     */
    toggleFinalState(stateId) {
        if (!this.states.includes(stateId)) return false;
        if (this.finalStates.has(stateId)) {
            this.finalStates.delete(stateId);
        } else {
            this.finalStates.add(stateId);
        }
        return true;
    }

    /**
     * Sets or unsets a state's accepting status in F explicitly.
     * @param {string} stateId - Identifier of the state.
     * @param {boolean} isFinal - True to include in F; false to exclude from F.
     * @returns {void}
     * @throws {Error} None. Edge condition: silently ignores state IDs that do not belong to Q.
     */
    setFinalState(stateId, isFinal) {
        if (!this.states.includes(stateId)) return;
        if (isFinal) {
            this.finalStates.add(stateId);
        } else {
            this.finalStates.delete(stateId);
        }
    }

    /**
     * Defines or deletes a deterministic transition mapping delta(fromState, symbol) = toState.
     * @param {string} fromState - Origin state in Q.
     * @param {string} symbol - Alphabet symbol in Sigma.
     * @param {string|null} toState - Destination state in Q, or null/empty to remove the transition.
     * @returns {boolean} True if transition was successfully updated or removed; false if parameters are invalid.
     * @throws {Error} None. Edge condition: returns false if fromState not in Q, toState (when provided) not in Q, or symbol not in Sigma.
     */
    setTransition(fromState, symbol, toState) {
        if (!this.states.includes(fromState)) return false;
        if (toState && !this.states.includes(toState)) return false;
        if (!this.alphabet.includes(symbol)) return false;

        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }

        if (toState) {
            this.transitions[fromState][symbol] = toState;
        } else {
            delete this.transitions[fromState][symbol];
        }
        return true;
    }

    /**
     * Retrieves the target state for a given transition delta(state, symbol).
     * @param {string} state - Origin state ID.
     * @param {string} symbol - Input alphabet symbol.
     * @returns {string|null} Destination state ID, or null if no transition exists.
     * @throws {Error} None. Edge condition: returns null if state or transition is undefined.
     */
    getTransition(state, symbol) {
        return (this.transitions[state] && this.transitions[state][symbol]) || null;
    }

    /**
     * Computes an automatic balanced geometric layout for all states on the canvas.
     * Uses horizontal arrangement for small state counts (<= 4) and circular layout for larger counts.
     * @param {number} [width=540] - Canvas width in pixels.
     * @param {number} [height=320] - Canvas height in pixels.
     * @returns {void}
     * @throws {Error} None. Edge condition: no-op if state count is 0.
     */
    autoLayout(width = 540, height = 320) {
        const n = this.states.length;
        if (n === 0) return;

        if (n <= 4) {
            // Horizontal row with padding
            const paddingX = 90;
            const stepX = (width - 2 * paddingX) / Math.max(1, n - 1);
            const centerY = height / 2;
            this.states.forEach((s, idx) => {
                this.positions[s] = {
                    x: paddingX + (n === 1 ? (width - 2 * paddingX) / 2 : idx * stepX),
                    y: centerY
                };
            });
        } else {
            // Circle layout for >= 5 states
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) * 0.35;
            this.states.forEach((s, idx) => {
                const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
                this.positions[s] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle)
                };
            });
        }
    }

    /**
     * Calculates an initial default coordinate placement for a newly added state.
     * @param {string} stateId - Identifier of the state to position.
     * @returns {void}
     * @throws {Error} None. Edge condition: clamps within canvas boundaries.
     */
    autoPositionState(stateId) {
        const n = this.states.length;
        const width = 540;
        const height = 320;
        const paddingX = 90;
        const stepX = 130;
        this.positions[stateId] = {
            x: Math.min(width - 60, paddingX + (n - 1) * stepX),
            y: height / 2 + ((n % 2 === 0) ? -20 : 20)
        };
    }

    /**
     * Loads the textbook standard preset DFA accepting binary strings ending with "01" over Sigma = {0, 1}.
     * Q = {q0, q1, q2}, q0 is start, F = {q2}.
     * @returns {void}
     * @throws {Error} None.
     */
    loadEndsWith01Example() {
        this.clear();
        this.setAlphabet(["0", "1"]);
        this.addState("q0", 100, 160);
        this.addState("q1", 270, 160);
        this.addState("q2", 440, 160);

        this.setInitialState("q0");
        this.setFinalState("q2", true);

        // delta for ends with '01'
        // q0: '0' -> q1, '1' -> q0
        this.setTransition("q0", "0", "q1");
        this.setTransition("q0", "1", "q0");

        // q1: '0' -> q1, '1' -> q2
        this.setTransition("q1", "0", "q1");
        this.setTransition("q1", "1", "q2");

        // q2: '0' -> q1, '1' -> q0
        this.setTransition("q2", "0", "q1");
        this.setTransition("q2", "1", "q0");
    }

    /**
     * Loads the textbook standard preset DFA accepting binary strings containing an even number of '0's over Sigma = {0, 1}.
     * Q = {q_even, q_odd}, q_even is start, F = {q_even}.
     * @returns {void}
     * @throws {Error} None.
     */
    loadEvenZerosExample() {
        this.clear();
        this.setAlphabet(["0", "1"]);
        this.addState("q_even", 160, 160);
        this.addState("q_odd", 380, 160);

        this.setInitialState("q_even");
        this.setFinalState("q_even", true);

        this.setTransition("q_even", "0", "q_odd");
        this.setTransition("q_even", "1", "q_even");

        this.setTransition("q_odd", "0", "q_even");
        this.setTransition("q_odd", "1", "q_odd");
    }
}

// Export for browser window
window.DFA = DFA;
