import { useEffect, useState } from "react";

export default function useFetch(fn: any) {
    const [data, setData] = useState([]);

    useEffect(() => {
        fn().then(setData);
    }, []);

    return data;
}