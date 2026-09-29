import { useAuth } from '../hooks/useAuth';

export const PermissionGate = ({ permission, role, children }: { permission?: string, role?: string, children: JSX.Element }) => {
  const { hasPermission, hasRole } = useAuth();
  
  if (role && !hasRole(role)) return null;
  if (permission && !hasPermission(permission)) return null;

  return children;
};
