import { motion } from "framer-motion";

const Welcome = () => {
  return (
    <section className="w-full py-12 md:py-16 lg:py-20">
      <motion.div 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Discover Your Next Destination
        </motion.h1>
        
        <motion.p 
          className="mt-4 md:mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto md:mx-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Explore unique places, connect with locals, and create unforgettable experiences around the world.
        </motion.p>
      </motion.div>
    </section>
  );
};

export default Welcome;

