import { useEffect, useState } from "react";
import api from "@/services/api";
import { 
    Search, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Users,
    RefreshCw,
    Calendar,
    CheckCircle,
    XCircle,
    Filter,
    Download,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    MailCheck,
    PhoneCall,
    Home,
    Clock,
    TrendingUp,
    Activity,
    Star,
    CreditCard
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner"; // ✅ Import sonner toast
import { Toaster } from "@/components/ui/sonner"; // ✅ Import Toaster component
import { format } from "date-fns";

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    address?: string;
    role: string;
    is_active: boolean;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
    total_bookings?: number;
    total_spent?: number;
}

interface PaginatedResponse {
    current_page: number;
    data: User[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

interface StatsData {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    newThisMonth: number;
    averageBookings: number;
    totalRevenue: number;
}

export default function Guests() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [stats, setStats] = useState<StatsData>({
        total: 0,
        active: 0,
        inactive: 0,
        verified: 0,
        newThisMonth: 0,
        averageBookings: 0,
        totalRevenue: 0
    });

    // Filters and sorting
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [verificationFilter, setVerificationFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(10);

    const fetchUsers = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);
            setError(null);

            const params: any = {
                page: currentPage,
                per_page: perPage,
                role: 'guest',
            };

            if (search) params.search = search;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (verificationFilter !== 'all') params.verified = verificationFilter;
            if (sortBy) params.sort = sortBy;

            const response = await api.get("/users", { params });
            const paginatedData = response.data as PaginatedResponse;
            const usersData = paginatedData.data || [];
            const guestUsers = usersData.filter(user => user.role === 'guest');
            
            setUsers(guestUsers);
            setLastPage(paginatedData.last_page);
            setTotal(paginatedData.total);
            setPerPage(paginatedData.per_page);

            // Calculate stats
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = guestUsers.filter(user => 
                new Date(user.created_at) >= firstDayOfMonth
            ).length;

            setStats({
                total: paginatedData.total,
                active: guestUsers.filter(u => u.is_active).length,
                inactive: guestUsers.filter(u => !u.is_active).length,
                verified: guestUsers.filter(u => u.email_verified_at).length,
                newThisMonth: newThisMonth,
                averageBookings: 0,
                totalRevenue: 0
            });

            // Cache to sessionStorage
            const cacheKey = `guests_${search}_${currentPage}_${statusFilter}_${verificationFilter}_${sortBy}`;
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data: guestUsers,
                lastPage: paginatedData.last_page,
                total: paginatedData.total,
                stats: {
                    total: paginatedData.total,
                    active: guestUsers.filter(u => u.is_active).length,
                    inactive: guestUsers.filter(u => !u.is_active).length,
                    verified: guestUsers.filter(u => u.email_verified_at).length,
                    newThisMonth: newThisMonth
                },
                timestamp: Date.now()
            }));

            // ✅ Success toast (only on manual refresh or when silent=false)
            if (!silent && !loading) {
                toast.success("Guests loaded", {
                    description: `Successfully loaded ${guestUsers.length} guests.`,
                });
            }

        } catch (err: any) {
            console.error("Error fetching guests:", err);
            setError(err.response?.data?.message || "Failed to load guests");
            
            // ✅ Error toast
            toast.error("Failed to load guests", {
                description: err.response?.data?.message || "Please check your connection and try again.",
            });
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        const cacheKey = `guests_${search}_${currentPage}_${statusFilter}_${verificationFilter}_${sortBy}`;
        sessionStorage.removeItem(cacheKey);
        fetchUsers(true);
        
        // ✅ Success toast for refresh
        toast.success("Refreshed", {
            description: "Guest list has been updated.",
        });
    };

    useEffect(() => {
        const cacheKey = `guests_${search}_${currentPage}_${statusFilter}_${verificationFilter}_${sortBy}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const isCacheValid = Date.now() - (parsed.timestamp || 0) < 5 * 60 * 1000;
                
                if (isCacheValid) {
                    setUsers(parsed.data);
                    setLastPage(parsed.lastPage);
                    setTotal(parsed.total);
                    if (parsed.stats) {
                        setStats(prev => ({ ...prev, ...parsed.stats }));
                    }
                    fetchUsers(true);
                } else {
                    fetchUsers();
                }
            } catch (err) {
                fetchUsers();
            }
        } else {
            fetchUsers();
        }
    }, [search, currentPage, statusFilter, verificationFilter, sortBy]);

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            "bg-gradient-to-br from-emerald-400 to-emerald-600",
            "bg-gradient-to-br from-teal-400 to-teal-600",
            "bg-gradient-to-br from-green-400 to-green-600",
            "bg-gradient-to-br from-cyan-400 to-cyan-600"
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash |= 0;
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        return format(new Date(dateString), 'MMM dd, yyyy');
    };

    const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-0">
                <div className="flex items-center justify-between p-6">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        {trend && (
                            <div className="flex items-center gap-1">
                                {trend === 'up' ? (
                                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                                ) : (
                                    <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                                )}
                                <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {trendValue}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <div className={`absolute inset-0 bg-${color}-100 rounded-full blur-xl opacity-50`}></div>
                        <div className={`relative p-3 bg-${color}-50 rounded-2xl`}>
                            <Icon className={`h-8 w-8 text-${color}-600`} />
                        </div>
                    </div>
                </div>
                <div className={`h-1 bg-gradient-to-r from-${color}-400 to-${color}-600`}></div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4 px-6 bg-gray-50 min-h-screen">
            {/* Add Toaster component at the top level */}
            <Toaster position="top-right" richColors />
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Guest Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage and monitor all registered guests
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button> */}
                    <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Guests"
                    value={stats.total}
                    icon={Users}
                    trend="up"
                    trendValue="+12%"
                    color="emerald"
                />
                <StatCard
                    title="Active Guests"
                    value={stats.active}
                    icon={UserCheck}
                    trend="up"
                    trendValue="+8%"
                    color="teal"
                />
                <StatCard
                    title="Email Verified"
                    value={stats.verified}
                    icon={MailCheck}
                    trend="up"
                    trendValue="+15%"
                    color="green"
                />
                <StatCard
                    title="New This Month"
                    value={stats.newThisMonth}
                    icon={Calendar}
                    trend="up"
                    trendValue="+23%"
                    color="cyan"
                />
            </div>

            {/* Filters Section */}
            <Card className="border border-gray-100 shadow-sm">
                <CardContent className="px-4 pt-4 pb-0">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, email, or contact..."
                                className="pl-10 border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] border-gray-200">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                            <SelectTrigger className="w-[180px] border-gray-200">
                                <SelectValue placeholder="Verification" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px] border-gray-200">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="name_asc">Name A-Z</SelectItem>
                                <SelectItem value="name_desc">Name Z-A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <p className="text-sm text-gray-500">Loading guests...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Guests Table */}
            {!loading && !error && (
                <Card className="border border-gray-100 shadow-sm mt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50 border-b border-gray-100">
                                <TableRow>
                                    <TableHead className="w-16">Avatar</TableHead>
                                    <TableHead>Guest Name</TableHead>
                                    <TableHead>Contact Details</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="py-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarFallback className={`${getAvatarColor(`${user.first_name} ${user.last_name}`)} text-white font-medium`}>
                                                        {getInitials(user.first_name, user.last_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    {user.email_verified_at && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                                                            <span className="text-xs text-emerald-600">Verified</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="text-sm text-gray-600">{user.email}</span>
                                                    </div>
                                                    {user.contact_number && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                            <span className="text-sm text-gray-600">{user.contact_number}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {user.address ? (
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                                                        <span className="text-sm text-gray-600 line-clamp-2 max-w-[200px]">
                                                            {user.address}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge 
                                                    className={user.is_active ? 
                                                        "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                                        "bg-gray-50 text-gray-600 border-gray-200"
                                                    }
                                                >
                                                    {user.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {formatDate(user.created_at)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="gap-2">
                                                            <Eye className="h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="gap-2">
                                                            <Edit className="h-4 w-4" />
                                                            Edit Guest
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="gap-2 text-red-600">
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete Guest
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-emerald-50 rounded-full">
                                                    <Users className="h-12 w-12 text-emerald-600" />
                                                </div>
                                                <p className="text-gray-500 font-medium">No guests found</p>
                                                <p className="text-sm text-gray-400">
                                                    {search ? "Try adjusting your search filters" : "No registered guests yet"}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {/* Pagination */}
            {!loading && !error && users.length > 0 && (
                <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, total)} of {total} guests
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((prev) => prev - 1)}
                                    className="gap-1 border-gray-200 hover:border-emerald-300"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Prev
                                </Button>
                                <div className="flex items-center gap-2">
                                    {[...Array(Math.min(5, lastPage))].map((_, i) => {
                                        let pageNum;
                                        if (lastPage <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= lastPage - 2) {
                                            pageNum = lastPage - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        if (pageNum > 0 && pageNum <= lastPage) {
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={currentPage === pageNum ? 
                                                        "bg-emerald-600 hover:bg-emerald-700 text-white" : 
                                                        "border-gray-200 hover:border-emerald-300"
                                                    }
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === lastPage}
                                    onClick={() => setCurrentPage((prev) => prev + 1)}
                                    className="gap-1 border-gray-200 hover:border-emerald-300"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}