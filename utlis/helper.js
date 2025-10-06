const roleDisplayNames = {
  super_admin: "Super Admin",
  business_owner: "Business Owner",
  manager: "Manager",
  support_staff: "Support Staff",
  buyer: "Buyer",
  guest: "Guest",
};

export const authorizeRoles = (req, allowedRoles = []) => {
  const userRole = req.user?.userRole;

  if (!userRole || !allowedRoles.includes(userRole)) {
    const allowedDisplay = allowedRoles
      .map((role) => roleDisplayNames[role] || role)
      .join(", ");
    const err = new Error(`Access denied. Only ${allowedDisplay} can perform this action.`);
    err.statusCode = 403;
    throw err;
  }

  return true;
};

export function checkAccountStatus(entity, entityName = "User") {
  if (!entity) throw new Error(`${entityName} not found`);
  if (entity.isDeleted || entity.deletedAt) throw new Error(`${entityName} account has been deleted. Contact support.`);
  if (entity.status === "inactive") throw new Error(`${entityName} account is inactive. Contact support.`);
}

export function validateTenantName(tenantName) {
  const tenantNameRegex = /^(?=.*[A-Z])[A-Za-z0-9 ]+$/;

  if (!tenantNameRegex.test(tenantName)) {
    return {
      valid: false,
      message: "Tenant name must be alphanumeric and contain at least one capital letter.",
    };
  }

  if (tenantName.length > 50) {
    return {
      valid: false,
      message: "Tenant name must not exceed 50 characters.",
    };
  }

  return { valid: true };
}