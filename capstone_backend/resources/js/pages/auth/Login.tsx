import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import login from "../../../images/login.png";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const currentPath = window.location.pathname;

        if (user.role === "admin" && currentPath !== "/dashboard") {
            window.location.replace("/dashboard");
        }

        if (user.role === "staff" && currentPath !== "/restaurant") {
            window.location.replace("/restaurant");
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post("http://127.0.0.1:8000/api/auth/login", {
                email,
                password,
            });

            const user = res.data.user;
            const token = res.data.token;

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);

            if (user.role === "admin") {
                window.location.replace("/dashboard");
            } else if (user.role === "staff") {
                window.location.replace("/restaurant");
            } else {
                setError("Access denied.");
                localStorage.clear();
            }

        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 sm:px-6 lg:px-8">
            {/* CARD */}
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">
                {/* LEFT SIDE */}
                <div className="flex items-center justify-center p-6 sm:p-8 md:p-10">
                    <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                                Welcome back
                            </h1>
                            <p className="text-sm text-gray-500 mt-2">
                                Login to your account to continue
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Email Input */}
                            <div className="relative">
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="peer w-full h-14 px-3 pt-1 pb-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:border-emerald-400 bg-white"
                                    placeholder=" "
                                    required
                                />
                                <label
                                    htmlFor="email"
                                    className="absolute left-3 bg-white px-1 text-gray-500 transition-all duration-200 pointer-events-none
                                    top-1/2 -translate-y-1/2 text-base
                                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-emerald-600
                                    peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs"
                                >
                                    Email address
                                </label>
                            </div>

                            {/* Password Input */}
                            <div className="relative">
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="peer w-full h-14 px-3 pt-1 pb-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:border-emerald-400 bg-white"
                                    placeholder=" "
                                    required
                                />
                                <label
                                    htmlFor="password"
                                    className="absolute left-3 bg-white px-1 text-gray-500 transition-all duration-200 pointer-events-none
                                    top-1/2 -translate-y-1/2 text-base
                                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-emerald-600
                                    peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs"
                                >
                                    Password
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-100 shadow-md hover:shadow-lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Logging in...
                                    </span>
                                ) : (
                                    "Login"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* RIGHT SIDE IMAGE */}
                <div className="relative hidden md:block bg-gradient-to-br from-emerald-700 to-emerald-900">
                    <img
                        src={login}
                        alt="Traveler's Inn"
                        className="w-full h-full object-cover mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                        <h2 className="text-2xl font-bold mb-2">Traveler's Inn</h2>
                        <p className="text-sm opacity-90 leading-relaxed">
                            Premium Stay Experience
                        </p>
                        <div className="mt-4 flex gap-2">
                            <div className="w-8 h-1 bg-emerald-400 rounded-full"></div>
                            <div className="w-8 h-1 bg-white/30 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}