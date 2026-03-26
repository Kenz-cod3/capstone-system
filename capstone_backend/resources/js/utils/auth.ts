export const setUser = (user: any) => {
    localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
    return JSON.parse(localStorage.getItem("user") || "null");
};

export const logout = () => {
    localStorage.removeItem("user");
};