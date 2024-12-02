-- This is an empty migration.
UPDATE tenants AS parent
SET
    second_resident_name = child.name,
    second_resident_phone = child.phone,
    second_resident_email = child.email,
    second_resident_current_address = child.current_address,
    second_resident_relation = parent.second_resident_relation
    FROM tenants AS child
WHERE parent.second_resident_id = child.id;