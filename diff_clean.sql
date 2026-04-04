-- RedefineIndex
CREATE UNIQUE INDEX `_customermanagers_AB_unique` ON `_customermanagers`(`A`, `B`);
DROP INDEX `_CustomerManagers_AB_unique` ON `_customermanagers`;

-- RedefineIndex
CREATE INDEX `_customermanagers_B_index` ON `_customermanagers`(`B`);
DROP INDEX `_CustomerManagers_B_index` ON `_customermanagers`;

-- RedefineIndex
CREATE UNIQUE INDEX `_dispatchmanagers_AB_unique` ON `_dispatchmanagers`(`A`, `B`);
DROP INDEX `_DispatchManagers_AB_unique` ON `_dispatchmanagers`;

-- RedefineIndex
CREATE INDEX `_dispatchmanagers_B_index` ON `_dispatchmanagers`(`B`);
DROP INDEX `_DispatchManagers_B_index` ON `_dispatchmanagers`;

-- RedefineIndex
CREATE UNIQUE INDEX `_salesestimatemanagers_AB_unique` ON `_salesestimatemanagers`(`A`, `B`);
DROP INDEX `_SalesEstimateManagers_AB_unique` ON `_salesestimatemanagers`;

-- RedefineIndex
CREATE INDEX `_salesestimatemanagers_B_index` ON `_salesestimatemanagers`(`B`);
DROP INDEX `_SalesEstimateManagers_B_index` ON `_salesestimatemanagers`;

-- RedefineIndex
CREATE UNIQUE INDEX `_salesinvoicemanagers_AB_unique` ON `_salesinvoicemanagers`(`A`, `B`);
DROP INDEX `_SalesInvoiceManagers_AB_unique` ON `_salesinvoicemanagers`;

-- RedefineIndex
CREATE INDEX `_salesinvoicemanagers_B_index` ON `_salesinvoicemanagers`(`B`);
DROP INDEX `_SalesInvoiceManagers_B_index` ON `_salesinvoicemanagers`;

