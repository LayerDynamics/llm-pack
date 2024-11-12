// jest.config.cjs

module.exports = {
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.js"],
	transform: {
		"^.+\\.jsx?$": "babel-jest",
	},
};
