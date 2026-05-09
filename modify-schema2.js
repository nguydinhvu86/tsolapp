const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('model Ecatalog ')) {
    schema += `

model Ecatalog {
  id              String         @id @default(uuid())
  code            String         @unique
  name            String
  date            DateTime       @default(now())
  validUntil      DateTime?
  customerId      String?
  customer        Customer?      @relation(fields: [customerId], references: [id])
  creatorId       String
  creator         User           @relation("EcatalogCreator", fields: [creatorId], references: [id])
  subTotal        Float          @default(0)
  taxAmount       Float          @default(0)
  totalAmount     Float          @default(0)
  status          String         @default("DRAFT")
  notes           String?        @db.Text
  items           EcatalogItem[]
  activityLogs    EcatalogActivityLog[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  tasks           Task[]
  EmailLog        EmailLog[]
  managers        User[]         @relation("EcatalogManagers")

  @@index([customerId])
  @@index([creatorId])
}

model EcatalogItem {
  id              String      @id @default(uuid())
  ecatalogId      String
  ecatalog        Ecatalog    @relation(fields: [ecatalogId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product?    @relation(fields: [productId], references: [id])
  customName      String?
  description     String?     @db.Text
  quantity        Float       @default(1)
  unit            String?
  unitPrice       Float       @default(0)
  taxRate         Float       @default(0)
  totalPrice      Float       @default(0)
  imageUrl        String?     @db.Text
  isSubItem       Boolean     @default(false)
  parentItemId    String?
  manufacture     String?
  origin          String?
  warranty        String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([ecatalogId])
  @@index([productId])
}

model EcatalogActivityLog {
  id         String   @id @default(uuid())
  ecatalogId String
  userId     String
  action     String
  details    String?  @db.Text
  createdAt  DateTime @default(now())
  ecatalog   Ecatalog @relation(fields: [ecatalogId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])

  @@index([ecatalogId])
  @@index([userId])
}
`;

    schema = schema.replace('model Customer {', 'model Customer {\n  ecatalogs       Ecatalog[]');
    schema = schema.replace('model Product {', 'model Product {\n  ecatalogItems   EcatalogItem[]');
    schema = schema.replace('model Task {', 'model Task {\n  ecatalogId      String?\n  ecatalog        Ecatalog?     @relation(fields: [ecatalogId], references: [id])');
    schema = schema.replace('model EmailLog {', 'model EmailLog {\n  ecatalogId        String?\n  ecatalog          Ecatalog?         @relation(fields: [ecatalogId], references: [id], onDelete: Cascade)');
    schema = schema.replace('model User {', 'model User {\n  ecatalogsCreated         Ecatalog[]             @relation("EcatalogCreator")\n  managedEcatalogs         Ecatalog[]             @relation("EcatalogManagers")\n  ecatalogActivityLogs     EcatalogActivityLog[]');

    fs.writeFileSync('prisma/schema.prisma', schema);
    console.log("Schema updated.");
} else {
    console.log("Already updated.");
}
