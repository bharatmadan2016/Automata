const fs = require("fs");
const path = require("path");

// Set up mock window object for browser scripts
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "js", "dfa.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "js", "validator.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "js", "simulator.js"), "utf8"));

const DFA = window.DFA;
const DFAValidator = window.DFAValidator;
const DFASimulator = window.DFASimulator;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Helper to record and print test results.
 */
function reportTest({ id, dfaName, input, expected, actual, pass, detail }) {
    totalTests++;
    if (pass) {
        passedTests++;
    } else {
        failedTests++;
    }
    const statusStr = pass ? "PASS ✅" : "FAIL ❌";
    const inputDisplay = (input !== undefined && input !== null) ? `"${input}"` : "N/A";
    const detailStr = detail ? ` (${detail})` : "";
    console.log(`[Test ${String(id).padStart(2, "0")}] DFA: ${dfaName.padEnd(16)} | Input: ${inputDisplay.padEnd(10)} | Expected: ${expected.padEnd(12)} | Actual: ${actual.padEnd(12)} | ${statusStr}${detailStr}`);
}

console.log("=================================================================================");
console.log("                       DFA SIMULATOR AUTOMATED TEST SUITE                       ");
console.log("=================================================================================\n");

let testCounter = 1;

// -----------------------------------------------------------------------------
// 1. Ends-with-01 preset (8 existing cases)
// -----------------------------------------------------------------------------
console.log("--- Category 1: Preset 'ends-with-01' Simulation Tests ---");
const dfa01 = new DFA();
dfa01.loadEndsWith01Example();

const endsWith01Cases = [
    { input: "1101", expected: "ACCEPTED" },
    { input: "1010", expected: "REJECTED" },
    { input: "01", expected: "ACCEPTED" },
    { input: "1111", expected: "REJECTED" },
    { input: "0001", expected: "ACCEPTED" },
    { input: "", expected: "REJECTED" },
    { input: "1021", expected: "ERROR" },
    { input: "101", expected: "ACCEPTED" }
];

endsWith01Cases.forEach((c) => {
    const sim = new DFASimulator(dfa01);
    const initRes = sim.init(c.input);
    let actual = sim.status;
    if (initRes.success && !initRes.finished) {
        sim.runAll();
        actual = sim.status;
    }
    reportTest({
        id: testCounter++,
        dfaName: "ends-with-01",
        input: c.input,
        expected: c.expected,
        actual: actual,
        pass: actual === c.expected
    });
});

// Also test "100" on ends-with-01 (ends with 00 -> REJECTED)
{
    const sim = new DFASimulator(dfa01);
    sim.init("100");
    sim.runAll();
    reportTest({
        id: testCounter++,
        dfaName: "ends-with-01",
        input: "100",
        expected: "REJECTED",
        actual: sim.status,
        pass: sim.status === "REJECTED",
        detail: "Ends in '00', not '01'"
    });
}

// -----------------------------------------------------------------------------
// 2. Even-zeros preset: "", "0", "00", "1010", "100", "10"
// -----------------------------------------------------------------------------
console.log("\n--- Category 2: Preset 'even-zeros' Simulation Tests ---");
const dfaEven = new DFA();
dfaEven.loadEvenZerosExample();

const evenZerosCases = [
    { input: "", expected: "ACCEPTED", detail: "0 zeros (even)" },
    { input: "0", expected: "REJECTED", detail: "1 zero (odd)" },
    { input: "00", expected: "ACCEPTED", detail: "2 zeros (even)" },
    { input: "1010", expected: "ACCEPTED", detail: "2 zeros (even)" },
    { input: "100", expected: "ACCEPTED", detail: "2 zeros (even count)" },
    { input: "10", expected: "REJECTED", detail: "1 zero (odd count)" }
];

evenZerosCases.forEach((c) => {
    const sim = new DFASimulator(dfaEven);
    const initRes = sim.init(c.input);
    let actual = sim.status;
    if (initRes.success && !initRes.finished) {
        sim.runAll();
        actual = sim.status;
    }
    reportTest({
        id: testCounter++,
        dfaName: "even-zeros",
        input: c.input,
        expected: c.expected,
        actual: actual,
        pass: actual === c.expected,
        detail: c.detail
    });
});

// -----------------------------------------------------------------------------
// 3. Invalid symbol handling: "1021" and "a" -> ERROR listing the invalid symbol
// -----------------------------------------------------------------------------
console.log("\n--- Category 3: Invalid Symbol Error Message Tests ---");
const invalidSymbolCases = [
    { input: "1021", invalidChar: "2" },
    { input: "a", invalidChar: "a" }
];

invalidSymbolCases.forEach((c) => {
    const sim = new DFASimulator(dfa01);
    const initRes = sim.init(c.input);
    const statusMatches = (sim.status === "ERROR" && initRes.success === false);
    const messageListsChar = initRes.message && initRes.message.includes(`'${c.invalidChar}'`);
    const pass = statusMatches && Boolean(messageListsChar);
    reportTest({
        id: testCounter++,
        dfaName: "ends-with-01",
        input: c.input,
        expected: `ERROR ('${c.invalidChar}')`,
        actual: `${sim.status} (${initRes.message ? "lists symbol" : "no msg"})`,
        pass: pass,
        detail: initRes.message
    });
});

// -----------------------------------------------------------------------------
// 4. Missing transition: remove one delta entry -> validator & simulator failure
// -----------------------------------------------------------------------------
console.log("\n--- Category 4: Missing Transition Integrity Tests ---");
const dfaIncomplete = new DFA();
dfaIncomplete.loadEndsWith01Example();
delete dfaIncomplete.transitions["q0"]["0"]; // remove delta(q0, '0')

const validationIncomplete = DFAValidator.validate(dfaIncomplete);
const hasMissingError = validationIncomplete.errors.some(e => e.includes("Missing transition"));
reportTest({
    id: testCounter++,
    dfaName: "incomplete-dfa",
    input: "N/A",
    expected: "isValid=false",
    actual: `isValid=${validationIncomplete.isValid}`,
    pass: (validationIncomplete.isValid === false && hasMissingError),
    detail: "DFAValidator flags missing transition"
});

const simIncomplete = new DFASimulator(dfaIncomplete);
const initIncompleteRes = simIncomplete.init("01");
reportTest({
    id: testCounter++,
    dfaName: "incomplete-dfa",
    input: "01",
    expected: "success=false",
    actual: `success=${initIncompleteRes.success}`,
    pass: (initIncompleteRes.success === false && simIncomplete.status === "ERROR"),
    detail: "Simulator rejects incomplete DFA"
});

// -----------------------------------------------------------------------------
// 5. Structural validator errors: no initial state, empty alphabet, empty state set
// -----------------------------------------------------------------------------
console.log("\n--- Category 5: Structural DFA Validation Error Tests ---");

// 5a. No initial state
const dfaNoInitial = new DFA();
dfaNoInitial.loadEndsWith01Example();
dfaNoInitial.initialState = null;
const valNoInit = DFAValidator.validate(dfaNoInitial);
const hasNoInitErr = valNoInit.errors.some(e => e.includes("Initial state"));
reportTest({
    id: testCounter++,
    dfaName: "no-initial-state",
    input: "N/A",
    expected: "Error: q0",
    actual: hasNoInitErr ? "Error: q0" : "No error",
    pass: (valNoInit.isValid === false && hasNoInitErr),
    detail: "Initial state missing error"
});

// 5b. Empty alphabet
const dfaEmptyAlpha = new DFA();
dfaEmptyAlpha.loadEndsWith01Example();
dfaEmptyAlpha.alphabet = [];
const valEmptyAlpha = DFAValidator.validate(dfaEmptyAlpha);
const hasEmptyAlphaErr = valEmptyAlpha.errors.some(e => e.includes("Alphabet"));
reportTest({
    id: testCounter++,
    dfaName: "empty-alphabet",
    input: "N/A",
    expected: "Error: Sigma",
    actual: hasEmptyAlphaErr ? "Error: Sigma" : "No error",
    pass: (valEmptyAlpha.isValid === false && hasEmptyAlphaErr),
    detail: "Alphabet empty error"
});

// 5c. Empty state set
const dfaEmptyStates = new DFA();
dfaEmptyStates.loadEndsWith01Example();
dfaEmptyStates.states = [];
const valEmptyStates = DFAValidator.validate(dfaEmptyStates);
const hasEmptyStatesErr = valEmptyStates.errors.some(e => e.includes("State set"));
reportTest({
    id: testCounter++,
    dfaName: "empty-states",
    input: "N/A",
    expected: "Error: Q",
    actual: hasEmptyStatesErr ? "Error: Q" : "No error",
    pass: (valEmptyStates.isValid === false && hasEmptyStatesErr),
    detail: "States set empty error"
});

// -----------------------------------------------------------------------------
// 6. No final states: validator warning, and every input string is rejected
// -----------------------------------------------------------------------------
console.log("\n--- Category 6: No Final States Warning & Rejection Tests ---");
const dfaNoFinal = new DFA();
dfaNoFinal.loadEndsWith01Example();
dfaNoFinal.finalStates.clear();

const valNoFinal = DFAValidator.validate(dfaNoFinal);
const hasNoFinalWarning = valNoFinal.warnings.some(w => w.includes("No accepting (final) states"));
reportTest({
    id: testCounter++,
    dfaName: "no-final-states",
    input: "N/A",
    expected: "Warning: F",
    actual: hasNoFinalWarning ? "Warning: F" : "No warning",
    pass: hasNoFinalWarning,
    detail: "DFAValidator issues final state warning"
});

const noFinalInputs = ["", "01", "1101", "000"];
let allRejected = true;
noFinalInputs.forEach(str => {
    const s = new DFASimulator(dfaNoFinal);
    s.init(str);
    s.runAll();
    if (s.status !== "REJECTED") allRejected = false;
});
reportTest({
    id: testCounter++,
    dfaName: "no-final-states",
    input: "multiple",
    expected: "REJECTED",
    actual: allRejected ? "REJECTED" : "ACCEPTED",
    pass: allRejected,
    detail: "All inputs rejected when F is empty"
});

// -----------------------------------------------------------------------------
// 7. Single-state DFA and long string (1000 characters)
// -----------------------------------------------------------------------------
console.log("\n--- Category 7: Single-State DFA & Long String (1000 chars) Tests ---");
const dfaSingle = new DFA();
dfaSingle.setAlphabet(["0", "1"]);
dfaSingle.addState("q_only", 200, 200);
dfaSingle.setInitialState("q_only");
dfaSingle.setFinalState("q_only", true); // accepting self-loop
dfaSingle.setTransition("q_only", "0", "q_only");
dfaSingle.setTransition("q_only", "1", "q_only");

const valSingle = DFAValidator.validate(dfaSingle);
reportTest({
    id: testCounter++,
    dfaName: "single-state",
    input: "N/A",
    expected: "isValid=true",
    actual: `isValid=${valSingle.isValid}`,
    pass: valSingle.isValid,
    detail: "Single-state complete DFA is valid"
});

const longString = "01".repeat(500); // 1000 characters
const simSingle = new DFASimulator(dfaSingle);
const initLongRes = simSingle.init(longString);
simSingle.runAll();
const longStringPassed = (initLongRes.success === true &&
                          simSingle.currentIndex === 1000 &&
                          simSingle.status === "ACCEPTED");
reportTest({
    id: testCounter++,
    dfaName: "single-state",
    input: "1000 chars",
    expected: "ACCEPTED",
    actual: simSingle.status,
    pass: longStringPassed,
    detail: `Processed ${simSingle.currentIndex} steps cleanly`
});

// -----------------------------------------------------------------------------
// 8. Stale state clearing on failed init() tests
// -----------------------------------------------------------------------------
console.log("\n--- Category 8: Stale State Clearing on Failed init() Tests ---");

// Test: Valid run followed by invalid symbol input -> assert history empty & currentState null
{
    const dfaStateTest = new DFA();
    dfaStateTest.loadEndsWith01Example();
    const sim = new DFASimulator(dfaStateTest);

    // 1. Run a valid string first
    sim.init("1101");
    sim.runAll();
    const validRanOk = (sim.history.length > 0 && sim.currentState !== null);

    // 2. Now initialize with an invalid symbol string
    const initRes = sim.init("1021");
    const stateCleared = (initRes.success === false &&
                          sim.history.length === 0 &&
                          sim.currentState === null &&
                          sim.currentIndex === 0 &&
                          sim.lastActiveEdge === null);

    reportTest({
        id: testCounter++,
        dfaName: "ends-with-01",
        input: "1021 after ok",
        expected: "empty & null",
        actual: (sim.history.length === 0 && sim.currentState === null) ? "empty & null" : "stale state",
        pass: validRanOk && stateCleared,
        detail: "History empty and currentState null on invalid symbol"
    });
}

// Test: Valid run followed by incomplete DFA -> assert history empty & currentState null
{
    const dfaStateTest2 = new DFA();
    dfaStateTest2.loadEndsWith01Example();
    const sim2 = new DFASimulator(dfaStateTest2);

    // 1. Run a valid string first
    sim2.init("01");
    sim2.runAll();
    const validRanOk2 = (sim2.history.length > 0 && sim2.currentState !== null);

    // 2. Invalidate the DFA (remove transition) and re-init
    delete dfaStateTest2.transitions["q0"]["0"];
    const initRes2 = sim2.init("01");
    const stateCleared2 = (initRes2.success === false &&
                           sim2.history.length === 0 &&
                           sim2.currentState === null &&
                           sim2.currentIndex === 0 &&
                           sim2.lastActiveEdge === null);

    reportTest({
        id: testCounter++,
        dfaName: "incomplete-dfa",
        input: "01 after ok",
        expected: "empty & null",
        actual: (sim2.history.length === 0 && sim2.currentState === null) ? "empty & null" : "stale state",
        pass: validRanOk2 && stateCleared2,
        detail: "History empty and currentState null on incomplete DFA"
    });
}

// -----------------------------------------------------------------------------
// Test Summary & Exit Code
// -----------------------------------------------------------------------------
console.log("\n=================================================================================");
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("=================================================================================");

if (failedTests > 0) {
    console.error(`\n❌ TEST SUITE FAILED with ${failedTests} failure(s).`);
    process.exit(1);
} else {
    console.log("\n✅ ALL AUTOMATED TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
}
