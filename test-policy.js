const { getPolicy } = require('./_api_core/policies-content');
try {
    const policy = getPolicy('terms');
    console.log('Policy terms found:', !!policy);
    const policy2 = getPolicy('limitation');
    console.log('Policy limitation found:', !!policy2);
    console.log('All good');
} catch (e) {
    console.error('Error calling getPolicy:', e.message);
    process.exit(1);
}
