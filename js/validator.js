/**
 * DFA Validator
 * Checks whether the automaton adheres to the mathematical definition of a complete DFA
 * and validates user input strings against the configured alphabet.
 */
class DFAValidator {
    /**
     * Validates whether a DFA satisfies formal completeness and structural integrity constraints.
     * Checks: non-empty state set Q, non-empty alphabet Sigma, valid initial state q0 in Q,
     * valid final states F subset of Q, and completeness of transition function delta: Q x Sigma -> Q.
     * @param {DFA} dfa - The DFA instance to validate.
     * @returns {{ isValid: boolean, errors: string[], warnings: string[] }} Validation report containing pass status, critical errors, and advisory warnings.
     * @throws {Error} None. Edge condition: flags missing transitions, empty sets, invalid references, and warns if final state set is empty.
     */
    static validate(dfa) {
        const errors = [];
        const warnings = [];

        // 1. Check Q (States)
        if (!dfa.states || dfa.states.length === 0) {
            errors.push("State set Q cannot be empty. Add at least one state.");
        }

        // 2. Check Sigma (Alphabet)
        if (!dfa.alphabet || dfa.alphabet.length === 0) {
            errors.push("Alphabet Σ cannot be empty. Define at least one input symbol.");
        }

        // 3. Check q0 (Initial State)
        if (!dfa.initialState) {
            errors.push("Initial state q₀ is not defined. Select a start state.");
        } else if (!dfa.states.includes(dfa.initialState)) {
            errors.push(`Initial state "${dfa.initialState}" does not exist in state set Q.`);
        }

        // 4. Check F (Final States)
        for (const f of dfa.finalStates) {
            if (!dfa.states.includes(f)) {
                errors.push(`Final state "${f}" does not exist in state set Q.`);
            }
        }
        if (dfa.finalStates.size === 0) {
            warnings.push("No accepting (final) states are configured. Every string will be rejected.");
        }

        // 5. Check Completeness of Transition Function delta: Q x Sigma -> Q
        if (dfa.states && dfa.alphabet) {
            for (const state of dfa.states) {
                for (const symbol of dfa.alphabet) {
                    const dest = dfa.getTransition(state, symbol);
                    if (!dest) {
                        errors.push(`Missing transition: δ(${state}, '${symbol}') is not defined.`);
                    } else if (!dfa.states.includes(dest)) {
                        errors.push(`Invalid transition: δ(${state}, '${symbol}') points to nonexistent state "${dest}".`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validates if a user-supplied input string contains only symbols defined in the alphabet Sigma.
     * @param {string} inputString - The raw string to test.
     * @param {string[]} alphabet - The valid alphabet array of symbols.
     * @returns {{ isValid: boolean, invalidChars: string[] }} Object indicating validity and listing any encountered unrecognized symbols.
     * @throws {Error} None. Edge condition: empty string returns isValid=true with empty invalidChars list.
     */
    static validateInputString(inputString, alphabet) {
        const invalidChars = [];
        for (const ch of inputString) {
            if (!alphabet.includes(ch) && !invalidChars.includes(ch)) {
                invalidChars.push(ch);
            }
        }
        return {
            isValid: invalidChars.length === 0,
            invalidChars
        };
    }
}

// Export for browser
window.DFAValidator = DFAValidator;
