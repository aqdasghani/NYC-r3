export function getDefaultRoute(role?: string): string {
  switch (role?.toUpperCase()) {
    case "BILLER":
    case "CASHIER":
      return "/dashboard";
    case "WORKER":
    case "STAFF":
      return "/dashboard";
    case "OWNER":
    case "ADMIN":
    default:
      return "/dashboard";
  }
}
