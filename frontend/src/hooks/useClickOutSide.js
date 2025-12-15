import { useEffect, useRef } from "react";

const useClickOutside = (callback) => {
    const ref = useRef(null);

    useEffect(() => {
        
        // event handler func
        const handleClickOutSide = (event) => {
            //check if 
              // - ref.current exists (element is rendered)
              // -AND clicked element is NOT inside our ref element
            if (ref.current && !ref.current.contains(event.target)){
                callback(); // execute the callback
            }
        };

        // add event listener to entire document
        document.addEventListener("mousedown", handleClickOutSide);
        document.addEventListener("touchstart", handleClickOutSide);

        // cleanup func: remove event listener when component unmounts
        return () => {
            document.removeEventListener("mousedown", handleClickOutSide);
            document.removeEventListener("touchstart", handleClickOutSide);
        }
    },[callback]) // re-run effect if callback changes

    return ref;  
}

export default useClickOutside;
