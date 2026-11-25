/**
 * DFA Simulation Engine
 * Executes input strings on a configured DFA step-by-step or in batch, maintaining execution history and state.
 */
class DFASimulator {
    /**
     * Initializes the simulator attached to a specific DFA instance.
     * @param {DFA} dfa - The DFA instance to execute simulations upon.
     */
    constructor(dfa) {
        this.dfa = dfa;
        this.inputString = "";
        this.currentIndex = 0;
        this.currentState = null;
        this.history = [];
        this.status = "IDLE"; // IDLE, READY, RUNNING, ACCEPTED, REJECTED, ERROR
        this.lastActiveEdge = null;
    }

    /**
     * Initializes a new simulation run with a given input string.
     * Validates that the underlying DFA is complete and that all characters belong to the alphabet.
     * @param {string} inputString - The input string to simulate.
     * @returns {{ success: boolean, message?: string, status?: string, finished?: boolean }} Result object with status, initialization success, and completion flag.
     * @throws {Error} None. Edge condition: handles empty string epsilon by immediately evaluating acceptance against start state. Returns failure if DFA is incomplete or input has invalid symbols.
     */
    init(inputString) {
        // Validate DFA first
        const validation = DFAValidator.validate(this.dfa);
        if (!validation.isValid) {
            this.status = "ERROR";
            this.history = [];
            this.currentIndex = 0;
            this.currentState = null;
            this.lastActiveEdge = null;
            return {
                success: false,
                message: "Cannot simulate: DFA is incomplete or invalid. Please check configuration."
            };
        }

        // Validate characters against alphabet
        const inputCheck = DFAValidator.validateInputString(inputString, this.dfa.alphabet);
        if (!inputCheck.isValid) {
            this.status = "ERROR";
            this.history = [];
            this.currentIndex = 0;
            this.currentState = null;
            this.lastActiveEdge = null;
            return {
                success: false,
                message: `Input contains invalid symbol(s): '${inputCheck.invalidChars.join("', '")}'. Alphabet is { ${this.dfa.alphabet.join(", ")} }.`
            };
        }

        this.inputString = inputString;
        this.currentIndex = 0;
        this.currentState = this.dfa.initialState;
        this.lastActiveEdge = null;
        this.history = [{
            step: 0,
            symbol: "—",
            fromState: "—",
            toState: this.currentState,
            isFinal: this.dfa.finalStates.has(this.currentState),
            note: "Start state"
        }];

        // If empty string input
        if (this.inputString.length === 0) {
            const isAccepted = this.dfa.finalStates.has(this.currentState);
            this.status = isAccepted ? "ACCEPTED" : "REJECTED";
            this.history[0].note = `Empty string ε evaluated: ${this.status}`;
            return {
                success: true,
                status: this.status,
                finished: true
            };
        }

        this.status = "READY";
        return {
            success: true,
            status: this.status,
            finished: false
        };
    }

    /**
     * Advances the simulation by exactly one symbol transition step.
     * Computes next state via delta(currentState, symbol), logs the step in history, and evaluates acceptance upon terminal character.
     * @returns {{ finished: boolean, status?: string, currentIndex?: number, symbol?: string, fromState?: string, toState?: string, isAccepted?: boolean|null, activeEdge?: Object, error?: string, currentState?: string }} Step execution result summary.
     * @throws {Error} None. Edge condition: returns error if simulator is uninitialized or in an error state; safely returns finished if input string already consumed.
     */
    step() {
        if (this.status === "IDLE" || this.status === "ERROR") {
            return { finished: true, error: "Simulation not initialized or has error." };
        }

        if (this.currentIndex >= this.inputString.length) {
            // Already finished
            return {
                finished: true,
                status: this.status,
                currentState: this.currentState
            };
        }

        const symbol = this.inputString[this.currentIndex];
        const from = this.currentState;
        const next = this.dfa.getTransition(from, symbol);

        if (!next) {
            this.status = "ERROR";
            return {
                finished: true,
                error: `No transition found for δ(${from}, '${symbol}')`
            };
        }

        this.lastActiveEdge = {
            from,
            symbol,
            to: next
        };

        this.currentState = next;
        this.currentIndex++;

        const isFinished = (this.currentIndex >= this.inputString.length);
        let stepNote = `δ(${from}, '${symbol}') → ${next}`;

        if (isFinished) {
            const isAccepted = this.dfa.finalStates.has(this.currentState);
            this.status = isAccepted ? "ACCEPTED" : "REJECTED";
            stepNote += ` (String completed: ${this.status})`;
        } else {
            this.status = "RUNNING";
        }

        this.history.push({
            step: this.currentIndex,
            symbol,
            fromState: from,
            toState: next,
            isFinal: this.dfa.finalStates.has(next),
            note: stepNote
        });

        return {
            finished: isFinished,
            status: this.status,
            currentIndex: this.currentIndex,
            symbol,
            fromState: from,
            toState: next,
            isAccepted: isFinished ? (this.status === "ACCEPTED") : null,
            activeEdge: this.lastActiveEdge
        };
    }

    /**
     * Runs all remaining transition steps sequentially until the string is completely consumed or an error occurs.
     * @returns {Object|null} The final step result object, or null if the string was empty or already completed.
     * @throws {Error} None. Edge condition: loops terminate immediately if status becomes ERROR.
     */
    runAll() {
        let result = null;
        while (this.currentIndex < this.inputString.length && this.status !== "ERROR") {
            result = this.step();
        }
        return result;
    }

    /**
     * Resets the simulation state and history back to step 0.
     * If an input string was previously set, re-initializes with that string; otherwise sets status to IDLE.
     * @returns {Object|void} If inputString exists, returns init() result; otherwise clears internal state.
     * @throws {Error} None. Edge condition: safely handles uninitialized simulator reset.
     */
    reset() {
        if (this.inputString !== undefined) {
            return this.init(this.inputString);
        }
        this.status = "IDLE";
        this.currentIndex = 0;
        this.currentState = null;
        this.history = [];
        this.lastActiveEdge = null;
    }
}

// Export for browser
window.DFASimulator = DFASimulator;
