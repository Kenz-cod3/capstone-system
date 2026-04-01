<!DOCTYPE html>
<html>
<head>
    @viteReactRefresh
    @vite(['resources/js/main.tsx'])

    <!-- ✅ ADD THIS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum/build/pannellum.css" />
</head>
<body>
    <div id="app"></div>

    <!-- ✅ ADD THIS -->
    <script src="https://cdn.jsdelivr.net/npm/pannellum/build/pannellum.js"></script>
</body>
</html>