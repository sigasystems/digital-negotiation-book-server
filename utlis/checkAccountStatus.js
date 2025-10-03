function checkAccountStatus(entity, entityName = "User") {
  if (!entity) throw new Error(`${entityName} not found`);
  if (entity.isDeleted || entity.deletedAt) throw new Error(`${entityName} account has been deleted. Contact support.`);
  if (entity.status === "inactive") throw new Error(`${entityName} account is inactive. Contact support.`);
}