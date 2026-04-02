const fs = require('fs');
const path = require('path');

const apiDir = path.join('C:', 'Users', 'pc', 'Desktop', 'info', 'Fraimel', 'Proyectos DS', 'Lexis Bill', 'api');
const targetFile = path.join(apiDir, 'index.js');
const targetContent = fs.readFileSync(targetFile, 'utf8');
const lines = targetContent.split('\n');

const startStr = '// --- 2. MODELOS ---';
const endStr = "const { validate607Format, validate606Format, validateNcfStructure } = require('./dgii-validator');";

const startIdx = lines.findIndex(l => l.includes(startStr));
const endIdx = lines.findIndex(l => l.includes(endStr));

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find start or end markers for extraction.");
    process.exit(1); 
}

const modelsDir = path.join(apiDir, 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
}

const extractedLines = lines.slice(startIdx + 1, endIdx);

const exportedModels = "User, PaymentRequest, InvoiceDraft, InvoiceTemplate, UserServices, NCFSettings, Invoice, Customer, SupportTicket, Expense, Quote, PolicyAcceptance, UserDocument, FiscalAuditLog, Partner, PartnerReferral, PartnerCommission, PartnerInvite, AdminAuditLog, PaymentAuditLog, SubscriptionAuditLog, Subscription, BillingEvent, PasswordReset, EmailVerify, generateInviteToken, generateReferralCode, getPartnerTier";

const modelsHeader = "const mongoose = require('mongoose');\n\n";
const modelsFooter = "\n\nmodule.exports = { " + exportedModels + " };\n";

const newModelsContent = modelsHeader + extractedLines.join('\n') + modelsFooter;
fs.writeFileSync(path.join(modelsDir, 'index.js'), newModelsContent);

const newIndexContent = lines.slice(0, startIdx + 1).join('\n') + 
`\nconst { ${exportedModels} } = require('./models');\n\n` + 
lines.slice(endIdx).join('\n');

fs.writeFileSync(targetFile, newIndexContent);
console.log('Extraction complete.');
