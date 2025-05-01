import React from 'react';
import { AuthProvider as Provider } from '../hooks/useAuth';

const AuthProvider = ({ children }) => <Provider>{children}</Provider>;

export default AuthProvider; 