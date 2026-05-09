const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(/model Ecatalog \{[\s\S]*?\}/, `model Ecatalog {
  id              String         @id @default(uuid())
  code            String         @unique
  name            String
  description     String?        @db.Text
  coverImage      String?        @db.Text
  isPublic        Boolean        @default(true)
  creatorId       String
  creator         User           @relation("EcatalogCreator", fields: [creatorId], references: [id])
  items           EcatalogItem[]
  activityLogs    EcatalogActivityLog[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  tasks           Task[]
  EmailLog        EmailLog[]
  managers        User[]         @relation("EcatalogManagers")

  @@index([creatorId])
}`);

schema = schema.replace(/model EcatalogItem \{[\s\S]*?\}/, `model EcatalogItem {
  id              String      @id @default(uuid())
  ecatalogId      String
  ecatalog        Ecatalog    @relation(fields: [ecatalogId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product?    @relation(fields: [productId], references: [id])
  
  customName      String?
  customDesc      String?     @db.Text
  customPrice     Float?
  imageUrl        String?     @db.Text
  displayOrder    Int         @default(0)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([ecatalogId])
  @@index([productId])
}`);

// We also need to remove references to `Ecatalog` in Lead, Project, and Customer since it's just a general catalog now.
schema = schema.replace(/ecatalogs\s+Ecatalog\[\]/g, '');
schema = schema.replace(/ecatalogsSalesperson\s+Ecatalog\[\]\s+@relation\("EcatalogSalesperson"\)/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated successfully');
