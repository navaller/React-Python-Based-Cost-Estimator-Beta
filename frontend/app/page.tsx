"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [projectsExist, setProjectsExist] = useState<boolean | null>(null);

  useEffect(() => {
    // Fetch projects to check if any exist
    const fetchProjects = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/projects/");
        if (Object.keys(response.data).length > 0) {
          setProjectsExist(true);
          router.push("/Projects"); // Redirect if projects exist
        } else {
          setProjectsExist(false);
        }
      } catch (error) {
        console.error("Error fetching projects", error);
        setProjectsExist(false);
      }
    };

    fetchProjects();
  }, [router]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      {projectsExist === null ? (
        <p className="text-lg">Loading...</p>
      ) : projectsExist === false ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Welcome to Shubdin Cost Estimator
          </h1>
          <p className="text-gray-600 mb-6">
            Get started by creating a project.
          </p>
          <Button onClick={() => router.push("/Projects")}>
            Create New Project
          </Button>
        </div>
      ) : null}
    </div>
  );
}
