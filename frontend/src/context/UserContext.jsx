import { createContext, useContext, useEffect, useState } from "react";
import { fetchEditorOptions } from "../api";

const UserContext = createContext(null);

function buildUserPermissions(users, userPermissions) {
  return users.map((user) => ({
    ...user,
    permissions: userPermissions
      .filter((permission) => String(permission.userId) === String(user.id))
      .map((permission) => ({
        id: permission.permissionId,
        name: permission.permissionName,
      })),
  }));
}

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchEditorOptions()
      .then((options) => {
        if (!active) return;
        const usersWithPermissions = buildUserPermissions(options.users || [], options.userPermissions || []);
        setUsers(usersWithPermissions);
        setActiveUserId(usersWithPermissions[0]?.id || "");
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeUser = users.find((user) => String(user.id) === String(activeUserId)) || null;

  return (
    <UserContext.Provider
      value={{
        users,
        activeUser,
        activeUserId,
        setActiveUserId,
        permissions: activeUser?.permissions || [],
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider.");
  }

  return context;
}
