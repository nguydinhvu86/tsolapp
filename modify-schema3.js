const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace('  items           EcatalogItem[]', `  templateType    String         @default("STANDARD")
  tags            String?
  salespersonId   String?
  salesperson     User?          @relation("EcatalogSalesperson", fields: [salespersonId], references: [id])
  leadId          String?
  lead            Lead?          @relation(fields: [leadId], references: [id], onDelete: SetNull)
  customerSignature    String?    @db.LongText
  customerSignedAt     DateTime?
  customerSignIP       String?
  customerSignDevice   String?
  customerSignLocation String?    @db.Text
  companySignature     String?    @db.LongText
  companySignedAt      DateTime?
  companySignerId      String?
  projects             Project[]
  items           EcatalogItem[]`);

schema = schema.replace('model User {', 'model User {\n  ecatalogsSalesperson     Ecatalog[]             @relation("EcatalogSalesperson")');
schema = schema.replace('model Lead {', 'model Lead {\n  ecatalogs                Ecatalog[]');
schema = schema.replace('model Project {', 'model Project {\n  ecatalogs                Ecatalog[]');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Done');
