    import React, { useState, useEffect } from "react";
    import axios from "axios";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Card } from "@/components/ui/card";

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

                // 🔥 CLEAN OLD DATA
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                // 🔥 SAVE NEW DATA
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("token", token);

                if (user.role === "admin") {
                    window.location.replace("/dashboard");
                }
                else if (user.role === "staff") {
                    window.location.replace("/restaurant");
                }
                else {
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
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">

                <Card className="w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden border-0">

                    <div className="grid md:grid-cols-2 h-[450px]">

                        {/* LEFT FORM */}
                        <div className="flex items-center justify-center bg-white px-8">
                            <form onSubmit={handleLogin} className="w-full max-w-sm">

                                <h1 className="text-2xl font-bold mb-1 text-slate-900">
                                    Welcome back
                                </h1>

                                <p className="text-sm text-slate-500 mb-5">
                                    Login to your account
                                </p>

                                {error && (
                                    <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">

                                    <div>
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-10"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-10"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700"
                                        disabled={loading}
                                    >
                                        {loading ? "Logging in..." : "Login"}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* RIGHT IMAGE */}
                        <div className="relative hidden md:block">
                            <img
                                src="https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg"
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-black/30"></div>

                            <div className="absolute bottom-6 left-6 text-white">
                                <h2 className="text-lg font-bold">Traveler's Inn</h2>
                                <p className="text-xs opacity-80">Premium Stay Experience</p>
                            </div>
                        </div>

                    </div>

                </Card>
            </div>
        );
    }

