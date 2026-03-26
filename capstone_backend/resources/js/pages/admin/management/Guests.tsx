import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import api from "@/services/api";

interface Guest {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    address?: string;
}

export default function Guests() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const fetchGuests = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const res = await api.get("/users", {
                params: {
                    role: "guest",
                    search: search,
                    page: currentPage,
                },
            });

            const data = res.data.data || [];

            setGuests(prev => {
                const isSame = JSON.stringify(prev) === JSON.stringify(data);
                return isSame ? prev : data;
            });

            setLastPage(res.data.last_page);

            // ✅ SAVE CACHE (key depends on search + page)
            const cacheKey = `guests_${search}_${currentPage}`;
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data,
                lastPage: res.data.last_page
            }));

        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        const cacheKey = `guests_${search}_${currentPage}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
            const parsed = JSON.parse(cached);

            setGuests(parsed.data);
            setLastPage(parsed.lastPage);

            // 🔥 silent update
            fetchGuests(true);
        } else {
            fetchGuests();
        }
    }, [search, currentPage]);

    return (
        <div className="bg-white shadow rounded p-4">
            <h1 className="text-xl font-bold mb-4">
                Mobile Registered Guests
            </h1>

            {/* 🔍 SEARCH */}
            <input
                type="text"
                placeholder="Search guest..."
                className="border p-2 mb-4 w-full rounded"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // reset page on search
                }}
            />

            {/* 🟡 LOADING */}
            {loading && <p>Loading...</p>}

            {/* TABLE */}
            {!loading && (
                <table className="w-full border">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Contact</th>
                            <th className="p-2">Address</th>
                        </tr>
                    </thead>

                    <tbody>
                        {guests.length > 0 ? (
                            guests.map((g) => (
                                <tr key={g.id} className="border-t">
                                    <td className="p-2">
                                        {g.first_name} {g.last_name}
                                    </td>
                                    <td className="p-2">{g.email}</td>
                                    <td className="p-2">
                                        {g.contact_number || "-"}
                                    </td>
                                    <td className="p-2">
                                        {g.address || "-"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="text-center p-4 text-gray-500"
                                >
                                    No guests found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {/* 🔵 PAGINATION */}
            <div className="flex justify-between items-center mt-4">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
                >
                    Prev
                </button>

                <span>
                    Page {currentPage} of {lastPage}
                </span>

                <button
                    disabled={currentPage === lastPage}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}