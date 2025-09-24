#!/usr/bin/env node

/**
 * Test script for the N8N JetNet Sync Workflow
 * This script validates the workflow configuration and tests key components
 */

const fs = require('fs');
const path = require('path');

// Load the workflow configuration
const workflowPath = path.join(__dirname, '..', 'n8n', 'sync.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('🧪 Testing N8N JetNet Sync Workflow Configuration\n');

// Test 1: Validate JSON structure
console.log('1. Validating JSON structure...');
try {
	JSON.stringify(workflow);
	console.log('   ✅ JSON is valid');
} catch (error) {
	console.log('   ❌ JSON is invalid:', error.message);
	process.exit(1);
}

// Test 2: Check required nodes
console.log('\n2. Checking required nodes...');
const requiredNodes = [
	'📋 Initialize Workflow1',
	'🔐 JetNet Authentication1',
	'✅ Validate Authentication1',
	'✈️ Fetch Aircraft Data1',
	'🔄 Process Aircraft Data1',
	'📢 Send Data to GHL1',
];

const nodeNames = workflow.nodes.map(node => node.name);
const missingNodes = requiredNodes.filter(name => !nodeNames.includes(name));

if (missingNodes.length === 0) {
	console.log('   ✅ All required nodes present');
} else {
	console.log('   ❌ Missing nodes:', missingNodes.join(', '));
}

// Test 3: Validate connections
console.log('\n3. Validating connections...');
const connections = workflow.connections;
let connectionErrors = 0;

for (const [sourceNode, targets] of Object.entries(connections)) {
	if (!nodeNames.includes(sourceNode)) {
		console.log(`   ❌ Source node "${sourceNode}" not found`);
		connectionErrors++;
	}

	for (const targetArray of targets.main) {
		for (const target of targetArray) {
			if (!nodeNames.includes(target.node)) {
				console.log(`   ❌ Target node "${target.node}" not found`);
				connectionErrors++;
			}
		}
	}
}

if (connectionErrors === 0) {
	console.log('   ✅ All connections valid');
} else {
	console.log(`   ❌ ${connectionErrors} connection errors found`);
}

// Test 4: Check environment variable usage
console.log('\n4. Checking environment variable usage...');
let envVarCount = 0;

workflow.nodes.forEach(node => {
	if (node.parameters) {
		const paramsStr = JSON.stringify(node.parameters);
		if (paramsStr.includes('$env.')) {
			envVarCount++;
			console.log(`   ✅ Node "${node.name}" uses environment variables`);
		}
	}
});

if (envVarCount > 0) {
	console.log(`   ✅ ${envVarCount} nodes use environment variables`);
} else {
	console.log('   ⚠️  No environment variables found (credentials may be hardcoded)');
}

// Test 5: Validate webhook URL
console.log('\n5. Validating webhook URL...');
const webhookNode = workflow.nodes.find(node => node.name === '📢 Send Data to GHL1');
if (webhookNode && webhookNode.parameters.url) {
	const url = webhookNode.parameters.url;
	if (url.includes('$env.NEXTAUTH_URL') || url.includes('ace-aircraft-sales-v2.vercel.app')) {
		console.log('   ✅ Webhook URL is properly configured');
	} else {
		console.log('   ❌ Webhook URL may be incorrect:', url);
	}
} else {
	console.log('   ❌ Webhook node not found or URL not configured');
}

// Test 6: Check error handling
console.log('\n6. Checking error handling...');
const nodesWithErrorHandling = workflow.nodes.filter(node => {
	if (node.parameters && node.parameters.jsCode) {
		return node.parameters.jsCode.includes('try') || node.parameters.jsCode.includes('catch');
	}
	return node.continueOnFail === true;
});

console.log(`   ✅ ${nodesWithErrorHandling.length} nodes have error handling`);

// Test 7: Validate workflow flow
console.log('\n7. Validating workflow flow...');
const startNode = '📋 Initialize Workflow1';
const endNodes = ['🎉 Workflow Complete1', 'Respond to Webhook1'];

// Simple flow validation - check if we can reach end nodes from start
const visited = new Set();
const queue = [startNode];

while (queue.length > 0) {
	const currentNode = queue.shift();
	if (visited.has(currentNode)) continue;
	visited.add(currentNode);

	if (connections[currentNode]) {
		for (const targetArray of connections[currentNode].main) {
			for (const target of targetArray) {
				if (!visited.has(target.node)) {
					queue.push(target.node);
				}
			}
		}
	}
}

const reachableEndNodes = endNodes.filter(node => visited.has(node));
if (reachableEndNodes.length > 0) {
	console.log('   ✅ Workflow flow is valid - can reach end nodes');
	console.log(`   📍 Reachable end nodes: ${reachableEndNodes.join(', ')}`);
} else {
	console.log('   ❌ Workflow flow may be broken - cannot reach end nodes');
	console.log(
		`   📍 Visited nodes: ${Array.from(visited).slice(0, 10).join(', ')}${
			visited.size > 10 ? '...' : ''
		}`
	);
}

// Test 8: Performance considerations
console.log('\n8. Performance considerations...');
const batchSizeNode = workflow.nodes.find(node => node.name === '🧩 Split Aircraft1');
if (batchSizeNode && batchSizeNode.parameters.batchSize) {
	const batchSize = batchSizeNode.parameters.batchSize;
	if (batchSize >= 10 && batchSize <= 50) {
		console.log(`   ✅ Batch size (${batchSize}) is reasonable`);
	} else {
		console.log(`   ⚠️  Batch size (${batchSize}) may need adjustment`);
	}
} else {
	console.log('   ⚠️  Batch size not configured');
}

// Summary
console.log('\n📊 Test Summary:');
console.log('================');
console.log(`Total nodes: ${workflow.nodes.length}`);
console.log(`Total connections: ${Object.keys(connections).length}`);
console.log(`Nodes with error handling: ${nodesWithErrorHandling.length}`);
console.log(`Environment variables used: ${envVarCount}`);

console.log('\n🎯 Workflow Configuration Status:');
if (missingNodes.length === 0 && connectionErrors === 0) {
	console.log('✅ WORKFLOW IS READY FOR DEPLOYMENT');
	console.log('\n📋 Next Steps:');
	console.log('1. Set environment variables in N8N:');
	console.log('   - JETNET_USERNAME');
	console.log('   - JETNET_PASSWORD');
	console.log('   - NEXTAUTH_URL');
	console.log('2. Import the workflow into N8N');
	console.log('3. Test with a small batch first');
	console.log('4. Monitor execution logs');
} else {
	console.log('❌ WORKFLOW NEEDS FIXES BEFORE DEPLOYMENT');
	console.log('\n🔧 Required fixes:');
	if (missingNodes.length > 0) {
		console.log(`- Add missing nodes: ${missingNodes.join(', ')}`);
	}
	if (connectionErrors > 0) {
		console.log(`- Fix ${connectionErrors} connection errors`);
	}
}

console.log('\n✨ Test completed!');
