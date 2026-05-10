import React from "react";
import MlsImportMock from "@/components/MlsImportMock";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function AddPropertyPage() {
  return (
    <main className="min-h-screen bg-vision-black text-white selection:bg-vision-green selection:text-black flex flex-col">
      <Navigation />
      
      <div className="flex-grow pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Add New Property</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Create a new property listing manually or auto-fill details by importing directly from the MLS database.
            </p>
          </div>

          {/* MLS Mock Component */}
          <MlsImportMock />

          {/* Placeholder for the rest of the standard form */}
          <div className="mt-16 max-w-3xl mx-auto bg-vision-surface/30 border border-gray-800 rounded-2xl p-8 opacity-50 relative">
             <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-2xl z-10">
                <span className="bg-vision-black/80 px-4 py-2 rounded-lg text-sm text-gray-400 font-medium">
                  Standard entry form disabled while viewing mock
                </span>
             </div>
             
             <div className="space-y-6 blur-sm pointer-events-none">
               <div className="h-10 bg-gray-800 rounded-lg w-full"></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="h-10 bg-gray-800 rounded-lg w-full"></div>
                 <div className="h-10 bg-gray-800 rounded-lg w-full"></div>
               </div>
               <div className="h-32 bg-gray-800 rounded-lg w-full"></div>
               <div className="h-12 bg-gray-800 rounded-lg w-32 ml-auto"></div>
             </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
