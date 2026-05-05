import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Role, Department } from '../types';

interface UsersContextType {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  getUserById: (userId: string) => User | undefined;
  getUsersByDepartment: (department: Department) => User[];
  getUsersByRole: (role: Role) => User[];
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

interface UsersProviderProps {
  children: ReactNode;
  initialUsers?: User[];
  initialCurrentUser?: User;
  syncedUsers?: User[] | null;
}

export const UsersProvider: React.FC<UsersProviderProps> = ({ 
  children, 
  initialUsers = [],
  initialCurrentUser,
  syncedUsers
}) => {
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    if (syncedUsers != null) {
      setUsers(syncedUsers);
    }
  }, [syncedUsers]);
  const [currentUser, setCurrentUser] = useState<User>(
    initialCurrentUser || initialUsers[0] || {
      id: 'anonymous',
      name: 'Anonymous User',
      role: Role.VIEWER,
      department: Department.SUSTAINABILITY,
      avatar: 'AU'
    }
  );

  const addUser = useCallback((user: User) => {
    setUsers(prevUsers => {
      if (prevUsers.find(u => u.id === user.id)) {
        return prevUsers; // User already exists
      }
      return [...prevUsers, user];
    });
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );
    // Update currentUser if it's the same user
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  }, [currentUser.id]);

  const getUserById = useCallback((userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  }, [users]);

  const getUsersByDepartment = useCallback((department: Department): User[] => {
    return users.filter(u => u.department === department);
  }, [users]);

  const getUsersByRole = useCallback((role: Role): User[] => {
    return users.filter(u => u.role === role);
  }, [users]);

  const value: UsersContextType = {
    currentUser,
    users,
    setCurrentUser,
    addUser,
    updateUser,
    getUserById,
    getUsersByDepartment,
    getUsersByRole,
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = (): UsersContextType => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
};
