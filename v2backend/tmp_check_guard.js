
const { Reflector } = require('@nestjs/core');

// Mock Reflector
class MockReflector {
    constructor(metadata) {
        this.metadata = metadata;
    }
    getAllAndOverride(key, targets) {
        return this.metadata[key] || [];
    }
}

// Mock ExecutionContext
class MockContext {
    constructor(user) {
        this.user = user;
    }
    switchToHttp() {
        return {
            getRequest: () => ({ user: this.user })
        };
    }
    getHandler() { return {}; }
    getClass() { return {}; }
}

// Logic from FeatureFlagGuard simplified
function checkGuard(metadata, user) {
    const reflector = new MockReflector(metadata);
    const context = new MockContext(user);

    const FEATURE_CARNETS_KEY = 'feature_carnets';
    const FEATURE_EMAILS_KEY = 'feature_emails';

    const allowedCarnets = reflector.getAllAndOverride(FEATURE_CARNETS_KEY, []);
    const allowedEmails = reflector.getAllAndOverride(FEATURE_EMAILS_KEY, []);

    console.log("Allowed Carnets:", allowedCarnets);
    console.log("Allowed Emails:", allowedEmails);
    console.log("User Info:", user);

    if (allowedCarnets.length === 0 && allowedEmails.length === 0) {
        return "PASS (No restriction)";
    }

    const userCarnet = user?.carnet;
    const userEmail = (user?.username || user?.correo || '').toLowerCase();

    if (!userCarnet && !userEmail) {
        return "FAIL (No carnet/email in request)";
    }

    const carnetMatch = allowedCarnets.length > 0 && allowedCarnets.includes(userCarnet);
    const emailMatch = allowedEmails.length > 0 && allowedEmails.some(e => e.toLowerCase() === userEmail);

    console.log("Carnet Match:", carnetMatch);
    console.log("Email Match:", emailMatch);

    if (!carnetMatch && !emailMatch) {
        return "FAIL (Access Denied)";
    }

    return "PASS (Access Granted)";
}

// TEST 1: Gustavo Lira (Current config)
const metadata = {
    'feature_carnets': ['500708'],
    'feature_emails': ['gustavo.lira@claro.com.ni']
};

const userGustavo = {
    carnet: '500708',
    username: 'gustavo.lira@claro.com.ni'
};

console.log("--- TEST GUSTAVO ---");
console.log("Result:", checkGuard(metadata, userGustavo));

// TEST 2: Gustavo Lira (Numeric carnet simulation)
const userGustavoNumeric = {
    carnet: 500708,
    username: 'gustavo.lira@claro.com.ni'
};
console.log("\n--- TEST GUSTAVO NUMERIC CARNET ---");
console.log("Result:", checkGuard(metadata, userGustavoNumeric));

// TEST 3: Email case difference
const userGustavoUpper = {
    carnet: '500708',
    username: 'GUSTAVO.LIRA@CLARO.COM.NI'
};
console.log("\n--- TEST GUSTAVO UPPER EMAIL ---");
console.log("Result:", checkGuard(metadata, userGustavoUpper));
