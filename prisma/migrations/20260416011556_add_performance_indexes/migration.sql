-- CreateIndex
CREATE INDEX `Customer_createdAt_idx` ON `Customer`(`createdAt`);

-- CreateIndex
CREATE INDEX `Lead_status_idx` ON `Lead`(`status`);

-- CreateIndex
CREATE INDEX `Project_status_idx` ON `Project`(`status`);

-- CreateIndex
CREATE INDEX `SalesEstimate_status_idx` ON `SalesEstimate`(`status`);

-- CreateIndex
CREATE INDEX `SalesInvoice_status_idx` ON `SalesInvoice`(`status`);

-- CreateIndex
CREATE INDEX `SalesOrder_status_idx` ON `SalesOrder`(`status`);

-- CreateIndex
CREATE INDEX `Task_status_idx` ON `Task`(`status`);

-- CreateIndex
CREATE INDEX `Task_dueDate_idx` ON `Task`(`dueDate`);

-- RedefineIndex
CREATE INDEX `Lead_creatorId_idx` ON `Lead`(`creatorId`);

-- RedefineIndex
CREATE INDEX `Lead_customerId_idx` ON `Lead`(`customerId`);

-- RedefineIndex
CREATE INDEX `Project_creatorId_idx` ON `Project`(`creatorId`);

-- RedefineIndex
CREATE INDEX `Project_customerId_idx` ON `Project`(`customerId`);

-- RedefineIndex
CREATE INDEX `SalesEstimate_creatorId_idx` ON `SalesEstimate`(`creatorId`);

-- RedefineIndex
CREATE INDEX `SalesEstimate_customerId_idx` ON `SalesEstimate`(`customerId`);

-- RedefineIndex
CREATE INDEX `SalesInvoice_creatorId_idx` ON `SalesInvoice`(`creatorId`);

-- RedefineIndex
CREATE INDEX `SalesInvoice_customerId_idx` ON `SalesInvoice`(`customerId`);

-- RedefineIndex
CREATE INDEX `SalesOrder_creatorId_idx` ON `SalesOrder`(`creatorId`);

-- RedefineIndex
CREATE INDEX `SalesOrder_customerId_idx` ON `SalesOrder`(`customerId`);

-- RedefineIndex
CREATE INDEX `Task_creatorId_idx` ON `Task`(`creatorId`);

-- RedefineIndex
CREATE INDEX `Task_customerId_idx` ON `Task`(`customerId`);

-- RedefineIndex
CREATE INDEX `Task_projectId_idx` ON `Task`(`projectId`);
