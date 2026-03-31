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
    CreditCard,
    Award,
    BarChart3,
    Zap
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
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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
    loyaltyLevel: string;
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
        totalRevenue: 0,
        loyaltyLevel: "Bronze"
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

            // Calculate stats with enhanced metrics
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const newThisMonth = guestUsers.filter(user => 
                new Date(user.created_at) >= firstDayOfMonth
            ).length;

            const totalRevenue = guestUsers.reduce((sum, user) => sum + (user.total_spent || 0), 0);
            const averageBookings = guestUsers.length > 0 
                ? guestUsers.reduce((sum, user) => sum + (user.total_bookings || 0), 0) / guestUsers.length 
                : 0;

            // Determine loyalty level based on total revenue
            let loyaltyLevel = "Bronze";
            if (totalRevenue > 50000) loyaltyLevel = "Platinum";
            else if (totalRevenue > 25000) loyaltyLevel = "Gold";
            else if (totalRevenue > 10000) loyaltyLevel = "Silver";

            setStats({
                total: paginatedData.total,
                active: guestUsers.filter(u => u.is_active).length,
                inactive: guestUsers.filter(u => !u.is_active).length,
                verified: guestUsers.filter(u => u.email_verified_at).length,
                newThisMonth: newThisMonth,
                averageBookings: Math.round(averageBookings * 10) / 10,
                totalRevenue: totalRevenue,
                loyaltyLevel: loyaltyLevel
            });

            if (!silent && !loading) {
                toast.success("Guests loaded", {
                    description: `Successfully loaded ${guestUsers.length} guests.`,
                });
            }

        } catch (err: any) {
            console.error("Error fetching guests:", err);
            setError(err.response?.data?.message || "Failed to load guests");
            
            toast.error("Failed to load guests", {
                description: err.response?.data?.message || "Please check your connection and try again.",
            });
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchUsers(true);
        toast.success("Refreshed", {
            description: "Guest list has been updated.",
        });
    };

    useEffect(() => {
        fetchUsers();
    }, [search, currentPage, statusFilter, verificationFilter, sortBy]);

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            "from-emerald-400 to-emerald-600",
            "from-teal-400 to-teal-600",
            "from-green-400 to-green-600",
            "from-cyan-400 to-cyan-600",
            "from-blue-400 to-blue-600",
            "from-indigo-400 to-indigo-600"
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

    const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, subtitle }: any) => (
        <Card className="border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        {subtitle && (
                            <p className="text-xs text-gray-400">{subtitle}</p>
                        )}
                        {trend && (
                            <div className="flex items-center gap-1 mt-1">
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
                        <div className={`absolute inset-0 bg-${color}-100 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                        <div className={`relative p-3 bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-2xl`}>
                            <Icon className={`h-6 w-6 text-${color}-600`} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
            <Toaster position="top-right" richColors />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900">Guest Management</h1>
                        </div>
                        <p className="text-sm text-gray-500 ml-11">
                            Manage and monitor all registered guests, track their activity and loyalty
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="gap-2 border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all">
                            <Download className="h-4 w-4" />
                            Export Data
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Guests"
                        value={stats.total}
                        icon={Users}
                        trend="up"
                        trendValue="+12% vs last month"
                        color="emerald"
                    />
                    <StatCard
                        title="Active Guests"
                        value={stats.active}
                        icon={UserCheck}
                        trend="up"
                        trendValue="+8% vs last month"
                        color="teal"
                    />
                    <StatCard
                        title="Email Verified"
                        value={stats.verified}
                        icon={MailCheck}
                        trend="up"
                        trendValue="+15% vs last month"
                        color="green"
                    />
                    <StatCard
                        title="New This Month"
                        value={stats.newThisMonth}
                        icon={Calendar}
                        trend="up"
                        trendValue="+23% vs last month"
                        color="cyan"
                    />
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        ₱{stats.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">From all guests</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-2xl">
                                    <CreditCard className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Avg. Bookings/User</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {stats.averageBookings}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">Bookings per guest</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-2xl">
                                    <BarChart3 className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-600">Loyalty Level</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {stats.loyaltyLevel}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">Based on total spending</p>
                                </div>
                                <div className="p-3 bg-amber-100 rounded-2xl">
                                    <Award className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Section */}
                <Card className="border-0 shadow-lg mb-8">
                    <CardContent className="p-6">
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
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                <p className="text-sm text-gray-500">Loading guests...</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {error && !loading && (
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="p-4 bg-red-50 rounded-full">
                                    <XCircle className="h-12 w-12 text-red-500" />
                                </div>
                                <p className="text-gray-500 font-medium">Failed to load guests</p>
                                <p className="text-sm text-gray-400">{error}</p>
                                <Button onClick={handleRefresh} variant="outline" className="mt-2">
                                    Try Again
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Guests Table */}
                {!loading && !error && (
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50 border-b border-gray-200">
                                    <TableRow>
                                        <TableHead className="w-16 py-4">Avatar</TableHead>
                                        <TableHead className="py-4">Guest Name</TableHead>
                                        <TableHead className="py-4">Contact Details</TableHead>
                                        <TableHead className="py-4">Address</TableHead>
                                        <TableHead className="py-4">Status</TableHead>
                                        <TableHead className="py-4">Joined</TableHead>
                                        <TableHead className="py-4 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? (
                                        users.map((user) => (
                                            <TableRow key={user.id} className="hover:bg-gray-50/80 transition-colors">
                                                <TableCell className="py-4">
                                                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                                                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(`${user.first_name} ${user.last_name}`)} text-white font-medium text-sm`}>
                                                            {getInitials(user.first_name, user.last_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell className="py-4">
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
                                                        {user.total_bookings && user.total_bookings > 0 && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Star className="h-3 w-3 text-amber-500" />
                                                                <span className="text-xs text-gray-500">
                                                                    {user.total_bookings} bookings
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
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
                                                <TableCell className="py-4">
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
                                                <TableCell className="py-4">
                                                    <Badge 
                                                        className={user.is_active ? 
                                                            "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : 
                                                            "bg-gray-50 text-gray-600 border-gray-200"
                                                        }
                                                    >
                                                        {user.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {formatDate(user.created_at)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-100">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                                                <Eye className="h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                                                <Edit className="h-4 w-4" />
                                                                Edit Guest
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="gap-2 text-red-600 cursor-pointer">
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
                    <Card className="border-0 shadow-lg mt-6">
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
                                        className="gap-1 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
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
                                                            "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white" : 
                                                            "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
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
                                        className="gap-1 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
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
        </div>
    );
}