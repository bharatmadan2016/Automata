/**
 * DFA Simulator - Root Automated Test Runner
 * Executes the complete automated test suite using dynamic relative path resolution via __dirname.
 */
const path = require("path");

// Delegate execution to the comprehensive test suite
require(path.join(__dirname, "TestCases", "test_suite.js"));
