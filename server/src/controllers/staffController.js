import { supabaseAdmin } from "../config/supabase.js";

import { ApiError } from "../middleware/errorHandler.js";

import { logActivity } from "../services/activityService.js";

import { listWorks } from "../services/workService.js";

import {
  asyncHandler,
  paginationMeta,
  parsePagination,
  sanitizeSearch,
} from "../utils/helpers.js";

import {
  createStaffSchema,
  statusSchema,
  updateStaffSchema,
} from "../validations/peopleValidations.js";


/*
|--------------------------------------------------------------------------
| Staff select
|--------------------------------------------------------------------------
*/

const STAFF_SELECT = `
  id,
  job_role,
  department,
  created_at,
  updated_at,
  profile:profiles!inner(
    id,
    full_name,
    email,
    phone,
    avatar_url,
    is_active,
    role,
    created_at,
    updated_at
  )
`;


/*
|--------------------------------------------------------------------------
| Empty workload
|--------------------------------------------------------------------------
*/

const EMPTY_LOAD = {
  active_works: 0,
  completed_works: 0,
  overdue_works: 0,
  avg_progress: 0,
};


/*
|--------------------------------------------------------------------------
| Shape staff response
|--------------------------------------------------------------------------
*/

function shape(row, load) {
  const workload = load || EMPTY_LOAD;

  return {
    id: row.id,

    full_name: row.profile.full_name,

    email: row.profile.email,

    phone: row.profile.phone,

    avatar_url: row.profile.avatar_url,

    is_active: row.profile.is_active,

    role: row.profile.role,

    job_role: row.job_role,

    department: row.department,

    created_at: row.created_at,

    updated_at: row.updated_at,

    active_works: Number(
      workload.active_works || 0
    ),

    completed_works: Number(
      workload.completed_works || 0
    ),

    overdue_works: Number(
      workload.overdue_works || 0
    ),

    avg_progress: Number(
      workload.avg_progress || 0
    ),
  };
}


/*
|--------------------------------------------------------------------------
| Load workload information
|--------------------------------------------------------------------------
*/

async function loadFor(ids) {
  if (!ids.length) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("staff_workload")
    .select("*")
    .in("staff_id", ids);

  if (error) {
    throw new ApiError(
      500,
      `Could not load staff workload: ${error.message}`
    );
  }

  return new Map(
    (data || []).map((row) => [
      row.staff_id,
      row,
    ])
  );
}


/*
|--------------------------------------------------------------------------
| Get one staff member
|--------------------------------------------------------------------------
*/

async function getOne(id) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("staff")
    .select(STAFF_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "getStaff Supabase error:",
      error
    );

    throw new ApiError(
      500,
      `Could not load staff member: ${error.message}`
    );
  }

  if (!data) {
    throw new ApiError(
      404,
      "Staff member not found."
    );
  }

  const workload = await loadFor([id]);

  return shape(
    data,
    workload.get(id)
  );
}


/*
|--------------------------------------------------------------------------
| LIST STAFF
|--------------------------------------------------------------------------
|
| GET /api/staff
|--------------------------------------------------------------------------
*/

export const listStaff = asyncHandler(
  async (req, res) => {
    const pagination = parsePagination(
      req.query,
      {
        defaultSize: 10,
        maxSize: 100,
      }
    );

    const search = sanitizeSearch(
      req.query.search
    );

    let query = supabaseAdmin
      .from("staff")
      .select(
        STAFF_SELECT,
        {
          count: "exact",
        }
      );


    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`,
        {
          referencedTable: "profile",
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (req.query.status === "active") {
      query = query.eq(
        "profile.is_active",
        true
      );
    }

    if (req.query.status === "inactive") {
      query = query.eq(
        "profile.is_active",
        false
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Query
    |--------------------------------------------------------------------------
    */

    const {
      data,
      count,
      error,
    } = await query
      .order("created_at", {
        ascending: false,
      })
      .range(
        pagination.from,
        pagination.to
      );


    if (error) {
      console.error(
        "listStaff Supabase error:",
        error
      );

      throw new ApiError(
        500,
        `Could not load staff: ${error.message}`
      );
    }


    const workload = await loadFor(
      (data || []).map(
        (row) => row.id
      )
    );


    res.json({
      data: (data || []).map(
        (row) =>
          shape(
            row,
            workload.get(row.id)
          )
      ),

      pagination: paginationMeta(
        pagination,
        count || 0
      ),
    });
  }
);


/*
|--------------------------------------------------------------------------
| STAFF OPTIONS
|--------------------------------------------------------------------------
|
| GET /api/staff/options
|--------------------------------------------------------------------------
*/

export const staffOptions = asyncHandler(
  async (req, res) => {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("staff")
      .select(STAFF_SELECT)
      .eq(
        "profile.is_active",
        true
      );


    if (error) {
      console.error(
        "staffOptions Supabase error:",
        error
      );

      throw new ApiError(
        500,
        `Could not load staff options: ${error.message}`
      );
    }


    const workload = await loadFor(
      (data || []).map(
        (row) => row.id
      )
    );


    const options = (data || [])
      .map(
        (row) =>
          shape(
            row,
            workload.get(row.id)
          )
      )
      .sort(
        (a, b) =>
          a.full_name.localeCompare(
            b.full_name
          )
      );


    res.json({
      data: options,
    });
  }
);


/*
|--------------------------------------------------------------------------
| GET STAFF
|--------------------------------------------------------------------------
|
| GET /api/staff/:id
|--------------------------------------------------------------------------
*/

export const getStaff = asyncHandler(
  async (req, res) => {
    const staff = await getOne(
      req.params.id
    );


    const [
      active,
      completed,
      overdue,
      activityResult,
    ] = await Promise.all([

      listWorks({
        user: req.user,

        filters: {
          staff_id: staff.id,

          status:
            "pending,assigned,in_progress,on_hold",

          sort: "deadline",

          pageSize: 50,
        },
      }),

      listWorks({
        user: req.user,

        filters: {
          staff_id: staff.id,

          status: "completed",

          pageSize: 20,
        },
      }),

      listWorks({
        user: req.user,

        filters: {
          staff_id: staff.id,

          deadline: "overdue",

          pageSize: 50,
        },
      }),

      supabaseAdmin
        .from("activity_logs")
        .select(`
          id,
          action,
          description,
          created_at,
          work_id,
          actor:profiles(
            id,
            full_name,
            avatar_url
          )
        `)
        .or(
          `user_id.eq.${staff.id},entity_id.eq.${staff.id}`
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(15),
    ]);


    if (activityResult.error) {
      console.error(
        "Activity query error:",
        activityResult.error
      );
    }


    res.json({
      staff,

      active_works:
        active.data || [],

      completed_works:
        completed.data || [],

      overdue_works:
        overdue.data || [],

      recent_activity:
        activityResult.data || [],
    });
  }
);


/*
|--------------------------------------------------------------------------
| CREATE STAFF
|--------------------------------------------------------------------------
|
| POST /api/staff
|
| IMPORTANT:
|
| 1. Create Supabase Auth user
| 2. Create profiles row
| 3. Create staff row
|
| There is NO database trigger creating staff.
|--------------------------------------------------------------------------
*/

export const createStaff = asyncHandler(
  async (req, res) => {

    const body =
      createStaffSchema.parse(
        req.body
      );


    /*
    |--------------------------------------------------------------------------
    | Normalize values
    |--------------------------------------------------------------------------
    */

    const email =
      body.email
        .trim()
        .toLowerCase();

    const fullName =
      body.full_name.trim();

    const phone =
      body.phone?.trim() || null;

    const jobRole =
      body.job_role?.trim() || null;

    const department =
      body.department?.trim() || null;


    /*
    |--------------------------------------------------------------------------
    | Check if profile already exists
    |--------------------------------------------------------------------------
    */

    const {
      data: existingProfile,
      error: existingProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();


    if (existingProfileError) {
      console.error(
        "Existing profile check error:",
        existingProfileError
      );

      throw new ApiError(
        500,
        `Could not check existing staff: ${existingProfileError.message}`
      );
    }


    if (existingProfile) {
      throw new ApiError(
        409,
        "A user with this email already exists."
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Create Supabase Auth user
    |--------------------------------------------------------------------------
    */

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,

        password: body.password,

        email_confirm: true,

        user_metadata: {
          full_name: fullName,
          role: "staff",
        },
      });


    if (
      authError ||
      !authData?.user
    ) {
      console.error(
        "Supabase Auth create error:",
        authError
      );

      throw new ApiError(
        400,
        authError?.message ||
          "Could not create authentication account."
      );
    }


    const userId =
      authData.user.id;


    /*
    |--------------------------------------------------------------------------
    | Rollback helper
    |--------------------------------------------------------------------------
    */

    async function rollbackAuthUser() {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );
      } catch (rollbackError) {
        console.error(
          "Auth rollback failed:",
          rollbackError
        );
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Create profile
    |--------------------------------------------------------------------------
    */

    const {
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,

          full_name: fullName,

          email,

          phone,

          avatar_url:
            body.avatar_url ||
            null,

          role: "staff",

          is_active: true,
        });


    if (profileError) {
      console.error(
        "Profile creation error:",
        profileError
      );

      await rollbackAuthUser();

      throw new ApiError(
        500,
        `Could not create staff profile: ${profileError.message}`
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Create staff record
    |--------------------------------------------------------------------------
    */

    const {
      error: staffError,
    } =
      await supabaseAdmin
        .from("staff")
        .insert({
          id: userId,

          job_role: jobRole,

          department,
        });


    if (staffError) {
      console.error(
        "Staff creation error:",
        staffError
      );


      /*
      |--------------------------------------------------------------------------
      | Rollback profile
      |--------------------------------------------------------------------------
      */

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);


      /*
      |--------------------------------------------------------------------------
      | Rollback Auth
      |--------------------------------------------------------------------------
      */

      await rollbackAuthUser();


      throw new ApiError(
        500,
        `Could not create staff record: ${staffError.message}`
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Activity log
    |--------------------------------------------------------------------------
    */

    try {
      await logActivity({
        userId: req.user.id,

        action: "staff.create",

        entityType: "staff",

        entityId: userId,

        description:
          `${req.user.full_name} added staff member ${fullName}`,
      });
    } catch (activityError) {
      /*
      |--------------------------------------------------------------------------
      | Activity logging failure should NOT destroy
      | the newly created staff account.
      |--------------------------------------------------------------------------
      */

      console.error(
        "Activity log error:",
        activityError
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Return created staff
    |--------------------------------------------------------------------------
    */

    const staff =
      await getOne(userId);


    res.status(201).json({
      staff,
    });
  }
);


/*
|--------------------------------------------------------------------------
| UPDATE STAFF
|--------------------------------------------------------------------------
|
| PUT /api/staff/:id
|--------------------------------------------------------------------------
*/

export const updateStaff = asyncHandler(
  async (req, res) => {

    const body =
      updateStaffSchema.parse(
        req.body
      );


    const staff =
      await getOne(
        req.params.id
      );


    const profilePatch = {};

    for (
      const key of [
        "full_name",
        "phone",
        "avatar_url",
      ]
    ) {
      if (key in body) {
        profilePatch[key] =
          body[key] ?? null;
      }
    }


    const staffPatch = {};

    for (
      const key of [
        "job_role",
        "department",
      ]
    ) {
      if (key in body) {
        staffPatch[key] =
          body[key] ?? null;
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Update profile
    |--------------------------------------------------------------------------
    */

    if (
      Object.keys(
        profilePatch
      ).length
    ) {

      const {
        error,
      } =
        await supabaseAdmin
          .from("profiles")
          .update(profilePatch)
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        console.error(
          "Profile update error:",
          error
        );

        throw new ApiError(
          500,
          `Could not update staff profile: ${error.message}`
        );
      }
    }


    /*
    |--------------------------------------------------------------------------
    | Update staff
    |--------------------------------------------------------------------------
    */

    if (
      Object.keys(
        staffPatch
      ).length
    ) {

      const {
        error,
      } =
        await supabaseAdmin
          .from("staff")
          .update(staffPatch)
          .eq(
            "id",
            req.params.id
          );


      if (error) {
        console.error(
          "Staff update error:",
          error
        );

        throw new ApiError(
          500,
          `Could not update staff information: ${error.message}`
        );
      }
    }


    const updated =
      await getOne(
        req.params.id
      );


    try {
      await logActivity({
        userId: req.user.id,

        action: "staff.update",

        entityType: "staff",

        entityId: updated.id,

        description:
          `${req.user.full_name} updated staff member ${updated.full_name}`,
      });
    } catch (error) {
      console.error(
        "Activity log error:",
        error
      );
    }


    res.json({
      staff: updated,
    });
  }
);


/*
|--------------------------------------------------------------------------
| SET STAFF STATUS
|--------------------------------------------------------------------------
|
| PATCH /api/staff/:id/status
|--------------------------------------------------------------------------
*/

export const setStaffStatus =
  asyncHandler(
    async (req, res) => {

      const {
        is_active,
      } =
        statusSchema.parse(
          req.body
        );


      const staff =
        await getOne(
          req.params.id
        );


      const {
        error,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            is_active,
          })
          .eq(
            "id",
            staff.id
          );


      if (error) {
        throw new ApiError(
          500,
          `Could not change staff status: ${error.message}`
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Sign out inactive staff
      |--------------------------------------------------------------------------
      */

      if (!is_active) {
        await supabaseAdmin.auth.admin
          .signOut(
            staff.id
          )
          .catch(
            (error) =>
              console.error(
                "Staff signout error:",
                error
              )
          );
      }


      try {
        await logActivity({
          userId: req.user.id,

          action: is_active
            ? "staff.activate"
            : "staff.deactivate",

          entityType: "staff",

          entityId: staff.id,

          description:
            `${req.user.full_name} ${
              is_active
                ? "activated"
                : "deactivated"
            } ${staff.full_name}`,
        });
      } catch (error) {
        console.error(
          "Activity log error:",
          error
        );
      }


      res.json({
        staff:
          await getOne(
            staff.id
          ),
      });
    }
  );


/*
|--------------------------------------------------------------------------
| DELETE STAFF
|--------------------------------------------------------------------------
|
| DELETE /api/staff/:id
|
| Uses:
|
| auth.users
|   ↓ cascade
| profiles
|   ↓ cascade
| staff
|
| work_assignments.staff_id
|   ↓ cascade
|
| Works themselves remain.
|--------------------------------------------------------------------------
*/

export const deleteStaff =
  asyncHandler(
    async (req, res) => {

      const staff =
        await getOne(
          req.params.id
        );


      if (
        staff.id ===
        req.user.id
      ) {
        throw new ApiError(
          400,
          "You cannot delete your own account."
        );
      }


      const {
        error,
      } =
        await supabaseAdmin.auth.admin
          .deleteUser(
            staff.id
          );


      if (error) {
        console.error(
          "Auth delete error:",
          error
        );

        throw new ApiError(
          500,
          `Could not delete staff member: ${error.message}`
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Do not create activity log AFTER deletion using the
      | deleted staff ID as entity_id if your FK setup doesn't
      | permit it.
      |--------------------------------------------------------------------------
      */

      try {
        await logActivity({
          userId: req.user.id,

          action: "staff.delete",

          entityType: "staff",

          entityId: null,

          description:
            `${req.user.full_name} deleted staff member ${staff.full_name}`,
        });
      } catch (error) {
        console.error(
          "Delete activity log error:",
          error
        );
      }


      res.json({
        message:
          "Staff member deleted.",
      });
    }
  );


/*
|--------------------------------------------------------------------------
| STAFF WORKS
|--------------------------------------------------------------------------
|
| GET /api/staff/:id/works
|--------------------------------------------------------------------------
*/

export const staffWorks =
  asyncHandler(
    async (req, res) => {

      if (
        req.user.role ===
          "staff" &&
        req.params.id !==
          req.user.id
      ) {
        throw new ApiError(
          403,
          "You do not have access to this resource."
        );
      }


      res.json(
        await listWorks({
          user: req.user,

          filters:
            req.query,

          forced: {
            staff_id:
              req.params.id,
          },
        })
      );
    }
  );