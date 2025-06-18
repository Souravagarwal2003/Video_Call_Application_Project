import { createContext, useContext, useEffect, useState } from "react";

// Create the context
const UserContext = createContext();

// Provider component to wrap around your app
export const UserProvider = ({ children }) => {
    // Initialize state with localStorage data to prevent flickering issues
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem("userData");
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const storedUser = localStorage.getItem("userData");
        console.log("Fetched user from localStorage:", storedUser);
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Function to update user data
    const updateUser = (newUserData) => {
        setUser(newUserData);
        localStorage.setItem("userData", JSON.stringify(newUserData));
    };

    return (
        <UserContext.Provider value={{ user, updateUser ,loading }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook for consuming the context
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
